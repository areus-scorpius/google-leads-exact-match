function main() {
  /*******************************************************
   *  CONFIG
   *******************************************************/
  // If true, logs only (no negatives actually created).
  var DRY_RUN = false;

  // If true, add negatives at campaign level, otherwise at ad group level.
  var NEGATIVE_AT_CAMPAIGN_LEVEL = true;

  // We want two date ranges: 'TODAY' and 'LAST_7_DAYS'.
  var DATE_RANGES = ['TODAY', 'LAST_7_DAYS'];

  /*******************************************************
   *  STEP 1: Collect ACTIVE Keywords by AdGroup or Campaign
   *******************************************************/
  // We will store all enabled keyword texts in a map keyed by either
  // campaignId or adGroupId, depending on NEGATIVE_AT_CAMPAIGN_LEVEL.

  var campaignIdToKeywords = {};
  var adGroupIdToKeywords  = {};

  var keywordIterator = AdsApp.keywords()
    .withCondition("Status = ENABLED")
    .get();

  while (keywordIterator.hasNext()) {
    var kw = keywordIterator.next();
    var campaignId = kw.getCampaign().getId();
    var adGroupId  = kw.getAdGroup().getId();
    var kwText     = kw.getText(); // e.g. "[web scraping api]"

    // Remove brackets/quotes if you only want the textual portion
    // Or keep them if you prefer. Usually best to store raw textual pattern 
    // (like [web scraping api]) so you can do advanced checks.
    // For the "plural ignoring" logic, we'll want the raw words minus brackets.
    var cleanedText = kwText
      .replace(/^\[|\]$/g, "")  // remove leading/trailing [ ]
      .trim();

    // If we are going to add negatives at campaign level,
    // group your keywords by campaign. Otherwise group by ad group.
    if (NEGATIVE_AT_CAMPAIGN_LEVEL) {
      if (!campaignIdToKeywords[campaignId]) {
        campaignIdToKeywords[campaignId] = [];
      }
      campaignIdToKeywords[campaignId].push(cleanedText);
    } else {
      if (!adGroupIdToKeywords[adGroupId]) {
        adGroupIdToKeywords[adGroupId] = [];
      }
      adGroupIdToKeywords[adGroupId].push(cleanedText);
    }
  }

  /*******************************************************
   *  STEP 2: Fetch Search Terms for Multiple Date Ranges
   *******************************************************/
  var combinedQueries = {}; 
  // We'll use an object to store unique queries keyed by "query|adGroupId|campaignId"

  DATE_RANGES.forEach(function(dateRange) {
    var awql = ""
      + "SELECT Query, AdGroupId, CampaignId "
      + "FROM SEARCH_QUERY_PERFORMANCE_REPORT "
      + "WHERE CampaignStatus = ENABLED "
      + "AND AdGroupStatus = ENABLED "
      + "DURING " + dateRange;

    var report = AdsApp.report(awql);
    var rows = report.rows();
    while (rows.hasNext()) {
      var row = rows.next();
      var query      = row["Query"];
      var adGroupId  = row["AdGroupId"];
      var campaignId = row["CampaignId"];

      var key = query + "|" + adGroupId + "|" + campaignId;
      combinedQueries[key] = {
        query: query,
        adGroupId: adGroupId,
        campaignId: campaignId
      };
    }
  });

  /*******************************************************
   *  STEP 3: For each unique query, see if it matches ANY
   *          active keyword in that ad group or campaign.
   *******************************************************/
  var totalNegativesAdded = 0;
  
  for (var uniqueKey in combinedQueries) {
    var data       = combinedQueries[uniqueKey];
    var query      = data.query;
    var adGroupId  = data.adGroupId;
    var campaignId = data.campaignId;

    // Pull out the relevant array of keywords
    var relevantKeywords;
    if (NEGATIVE_AT_CAMPAIGN_LEVEL) {
      relevantKeywords = campaignIdToKeywords[campaignId] || [];
    } else {
      relevantKeywords = adGroupIdToKeywords[adGroupId] || [];
    }

    // Decide if `query` is equivalent to AT LEAST one of those 
    // keywords, ignoring major plurals. If so, skip adding negative.
    var isEquivalentToSomeKeyword = false;

    for (var i = 0; i < relevantKeywords.length; i++) {
      var kwText = relevantKeywords[i];
      // Check if they are the same ignoring plurals
      if (areEquivalentIgnoringMajorPlurals(kwText, query)) {
        isEquivalentToSomeKeyword = true;
        break;
      }
    }

    // If NOT equivalent, we add a negative EXACT match
    if (!isEquivalentToSomeKeyword) {
      if (NEGATIVE_AT_CAMPAIGN_LEVEL) {
        // Add negative at campaign level
        var campIt = AdsApp.campaigns().withIds([campaignId]).get();
        if (campIt.hasNext()) {
          var campaign = campIt.next();
          if (!negativeAlreadyExists(null, campaign, query, true)) {
            if (DRY_RUN) {
              Logger.log("DRY RUN: Would add negative [" + query + "] at campaign: " 
                         + campaign.getName());
            } else {
              campaign.createNegativeKeyword("[" + query + "]");
              Logger.log("ADDED negative [" + query + "] at campaign: " + campaign.getName());
              totalNegativesAdded++;
            }
          }
        }
      } else {
        // Add negative at ad group level
        var adgIt = AdsApp.adGroups().withIds([adGroupId]).get();
        if (adgIt.hasNext()) {
          var adGroup = adgIt.next();
          if (!negativeAlreadyExists(adGroup, null, query, false)) {
            if (DRY_RUN) {
              Logger.log("DRY RUN: Would add negative [" + query + "] at ad group: " 
                         + adGroup.getName());
            } else {
              adGroup.createNegativeKeyword("[" + query + "]");
              Logger.log("ADDED negative [" + query + "] at ad group: " + adGroup.getName());
              totalNegativesAdded++;
            }
          }
        }
      }
    } else {
      Logger.log("SKIP negative — Query '" + query + "' matches at least one keyword");
    }
  }

  Logger.log("Done. Negatives added: " + totalNegativesAdded);
}

/**
 * Helper: Checks if an exact-match negative `[term]` 
 * already exists at the chosen level (ad group or campaign).
 *
 * @param {AdGroup|null}   adGroup   The ad group object (if adding at ad group level)
 * @param {Campaign|null}  campaign  The campaign object (if adding at campaign level)
 * @param {string}         term      The user query to block
 * @param {boolean}        isCampaignLevel  True => campaign-level
 * @returns {boolean}      True if negative already exists
 */
function negativeAlreadyExists(adGroup, campaign, term, isCampaignLevel) {
  var negIter;
  if (isCampaignLevel) {
    negIter = campaign
      .negativeKeywords()
      .withCondition("KeywordText = '" + term + "'")
      .get();
  } else {
    negIter = adGroup
      .negativeKeywords()
      .withCondition("KeywordText = '" + term + "'")
      .get();
  }
  
  while (negIter.hasNext()) {
    var neg = negIter.next();
    if (neg.getMatchType() === "EXACT") {
      return true;
    }
  }
  return false;
}

/**
 * Returns true if `query` is effectively the same as `kwText`,
 * ignoring major plural variations (including s, es, ies,
 * plus some common irregulars).
 */
function areEquivalentIgnoringMajorPlurals(kwText, query) {
  // Convert each to lower case and strip brackets if needed.
  // E.g. " [web scraping api]" => "web scraping api"
  var kwWords = kwText
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .trim()
    .split(/\s+/);

  var qWords = query
    .toLowerCase()
    .split(/\s+/);

  if (kwWords.length !== qWords.length) {
    return false;
  }

  for (var i = 0; i < kwWords.length; i++) {
    if (singularize(kwWords[i]) !== singularize(qWords[i])) {
      return false;
    }
  }
  return true;
}

/** 
 * Convert word to “singular” for matching. This handles:
 * 
 * - A set of well-known irregular plurals
 * - Typical endings: "ies" => "y", "es" => "", "s" => "" 
 */
function singularize(word) {
  var IRREGULARS = {
    "children": "child",
    "men": "man",
    "women": "woman",
    "geese": "goose",
    "feet": "foot",
    "teeth": "tooth",
    "people": "person",
    "mice": "mouse",
    "knives": "knife",
    "wives": "wife",
    "lives": "life",
    "calves": "calf",
    "leaves": "leaf",
    "wolves": "wolf",
    "selves": "self",
    "elves": "elf",
    "halves": "half",
    "loaves": "loaf",
    "scarves": "scarf",
    "octopi": "octopus",
    "cacti": "cactus",
    "foci": "focus",
    "fungi": "fungus",
    "nuclei": "nucleus",
    "syllabi": "syllabus",
    "analyses": "analysis",
    "diagnoses": "diagnosis",
    "oases": "oasis",
    "theses": "thesis",
    "crises": "crisis",
    "phenomena": "phenomenon",
    "criteria": "criterion",
    "data": "datum",
    "media": "medium"
  };

  var lower = word.toLowerCase();
  if (IRREGULARS[lower]) {
    return IRREGULARS[lower];
  }

  if (lower.endsWith("ies") && lower.length > 3) {
    return lower.substring(0, lower.length - 3) + "y";
  } else if (lower.endsWith("es") && lower.length > 2) {
    return lower.substring(0, lower.length - 2);
  } else if (lower.endsWith("s") && lower.length > 1) {
    return lower.substring(0, lower.length - 1);
  }
  return lower;
}
