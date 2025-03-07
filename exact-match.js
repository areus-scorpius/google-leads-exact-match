function main() {
  /*******************************************************
   *  CONFIGURATION
   *******************************************************/
  var DRY_RUN = false;
  var NEGATIVE_AT_CAMPAIGN_LEVEL = true;
  var CONVERSION_LOOKBACK = 'LAST_14_DAYS';  // Lookback window for conversions
  var VALUE_LOOKBACK_DAYS = 90;  // Lookback window for all conversion value (by conversion time)
  var VALUE_THRESHOLD = 1000;  // Min All Conversion Value to remove negative
  var TARGET_CAMPAIGN_NAMES = [
    "INPUT_YOUR_CAMPAIGN_NAME_HERE",
    "INPUT_YOUR_CAMPAIGN_NAME_HERE"
  ];

  var today = new Date();
  var endDate = formatDate(today);
  var startDate = formatDate(new Date(today.setDate(today.getDate() - VALUE_LOOKBACK_DAYS)));

  /*******************************************************
   *  STEP 1: Collect Active Keywords That Have Clicks
   *******************************************************/
  var campaignIdToKeywords = {};
  var campaignNameToId = {};

  var campaignIterator = AdsApp.campaigns()
    .withCondition("CampaignStatus = ENABLED")
    .get();

  while (campaignIterator.hasNext()) {
    var campaign = campaignIterator.next();
    var campaignName = campaign.getName();
    var campaignId = campaign.getId();

    if (TARGET_CAMPAIGN_NAMES.includes(campaignName)) {
      campaignNameToId[campaignName] = campaignId;
      campaignIdToKeywords[campaignId] = [];
    }
  }

  var keywordIterator = AdsApp.keywords()
    .withCondition("CampaignStatus = ENABLED")
    .withCondition("AdGroupStatus = ENABLED")
    .withCondition("Status = ENABLED")
    .withCondition("Clicks > 0")  // Ensure keyword received clicks
    .get();

  while (keywordIterator.hasNext()) {
    var kw = keywordIterator.next();
    var campaignId = kw.getCampaign().getId();
    var kwText = kw.getText().replace(/^\[|\]$/g, "").trim();

    if (campaignIdToKeywords.hasOwnProperty(campaignId)) {
      campaignIdToKeywords[campaignId].push(kwText);
    }
  }

  /*******************************************************
   *  STEP 2: Fetch Search Terms (14-day conversions)
   *******************************************************/
  var combinedQueries = {};
  var highValueQueries = new Set();

  var conversionAwql = `
    SELECT Query, CampaignId, Conversions, AllConversionValue
    FROM SEARCH_QUERY_PERFORMANCE_REPORT
    WHERE CampaignStatus = ENABLED
    AND AdGroupStatus = ENABLED
    AND Clicks > 0
    DURING ${CONVERSION_LOOKBACK}`;

  var conversionReport = AdsApp.report(conversionAwql);
  var conversionRows = conversionReport.rows();

  while (conversionRows.hasNext()) {
    var row = conversionRows.next();
    var query = row["Query"];
    var campaignId = row["CampaignId"];
    var conversions = parseFloat(row["Conversions"]);
    var conversionValue = parseFloat(row["AllConversionValue"]);

    if (campaignIdToKeywords.hasOwnProperty(campaignId)) {
      if (!combinedQueries[query]) {
        combinedQueries[query] = { query, campaignId, conversions, conversionValue };
      } else {
        combinedQueries[query].conversions += conversions;
        combinedQueries[query].conversionValue += conversionValue;
      }
    }
  }

  /*******************************************************
   *  STEP 3: Fetch Long-Term (90-Day) Conversion Value
   *******************************************************/
  var longTermAwql = `
    SELECT Query, CampaignId, AllConversionValue
    FROM SEARCH_QUERY_PERFORMANCE_REPORT
    WHERE CampaignStatus = ENABLED
    AND AdGroupStatus = ENABLED
    AND Clicks > 0
    DURING ${startDate},${endDate}`;

  var longTermReport = AdsApp.report(longTermAwql);
  var longTermRows = longTermReport.rows();

  while (longTermRows.hasNext()) {
    var row = longTermRows.next();
    var query = row["Query"];
    var campaignId = row["CampaignId"];
    var conversionValue = parseFloat(row["AllConversionValue"]);

    if (campaignIdToKeywords.hasOwnProperty(campaignId) && conversionValue > VALUE_THRESHOLD) {
      highValueQueries.add(query);
    }
  }

  /*******************************************************
   *  STEP 4: Remove Negatives for High-Value Queries
   *******************************************************/
  highValueQueries.forEach(function (query) {
    removeNegativeKeyword(query, combinedQueries[query].campaignId);
  });

  /*******************************************************
   *  STEP 5: Add Negatives for Non-Converting Queries (Distinct Variants)
   *******************************************************/
  var totalNegativesAdded = 0;

  for (var query in combinedQueries) {
    var data = combinedQueries[query];
    var campaignId = data.campaignId;

    if (highValueQueries.has(query)) {
      Logger.log("SKIP negative — Query '" + query + "' has high All Conv. Value.");
      continue;
    }

    var isSimilarToExisting = campaignIdToKeywords[campaignId].some(kwText =>
      isSimilarKeyword(kwText, query)
    );

    if (!isSimilarToExisting) {
      var campaign = AdsApp.campaigns().withIds([campaignId]).get().next();
      if (!negativeAlreadyExists(campaign, query)) {
        if (DRY_RUN) {
          Logger.log("DRY RUN: Would add negative [" + query + "] at campaign: " + campaign.getName());
        } else {
          campaign.createNegativeKeyword("[" + query + "]");
          Logger.log("ADDED negative [" + query + "] at campaign: " + campaign.getName());
          totalNegativesAdded++;
        }
      }
    } else {
      Logger.log("SKIP negative — Query '" + query + "' is similar to an existing keyword.");
    }
  }

  Logger.log("Done. Negatives added: " + totalNegativesAdded);
}

/*******************************************************
 *  FUNCTION: Remove Negative Keyword If It Has High Conversion Value
 *******************************************************/
function removeNegativeKeyword(query, campaignId) {
  var campaign = AdsApp.campaigns().withIds([campaignId]).get().next();
  var negIter = campaign.negativeKeywords()
    .withCondition("KeywordText = '" + query + "'")
    .get();

  while (negIter.hasNext()) {
    var negKeyword = negIter.next();
    if (DRY_RUN) {
      Logger.log("DRY RUN: Would REMOVE negative [" + query + "]");
    } else {
      negKeyword.remove();
      Logger.log("REMOVED negative [" + query + "] from campaign: " + campaign.getName());
    }
  }
}

/*******************************************************
 *  FUNCTION: Check If Query Is a Similar Variant of a Keyword
 *******************************************************/
function isSimilarKeyword(kwText, query) {
  return kwText.replace(/\s+/g, "").toLowerCase() === query.replace(/\s+/g, "").toLowerCase() ||
         kwText.replace(/\s+/g, "").includes(query.replace(/\s+/g, "")) ||
         query.replace(/\s+/g, "").includes(kwText.replace(/\s+/g, ""));
}

/*******************************************************
 *  FUNCTION: Check If Negative Already Exists
 *******************************************************/
function negativeAlreadyExists(campaign, term) {
  var negIter = campaign
    .negativeKeywords()
    .withCondition("KeywordText = '" + term + "'")
    .get();

  return negIter.hasNext();
}

/*******************************************************
 *  FUNCTION: Format Date for Google Ads Query
 *******************************************************/
function formatDate(date) {
  return date.getFullYear() + ('0' + (date.getMonth() + 1)).slice(-2) + ('0' + date.getDate()).slice(-2);
}
