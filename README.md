# **Google Ads Negative Keyword Automation Script**  

## **Overview**  
This script automatically manages negative keywords in Google Ads campaigns by analyzing search terms and conversion data. It helps advertisers block **wasteful search terms** while keeping **high-performing queries** active.  

## **Key Features**  
- ✅ **14-Day Lookback for Conversions:** Only considers conversions from the past 14 days.  
- ✅ **90-Day Lookback for All Conversion Value:** Ensures high-value queries remain active.  
- ✅ **Filters for Active Keywords with Clicks:** Only examines enabled keywords that received clicks.  
- ✅ **Prevents Blocking Similar Variants:** Avoids adding negatives for **close variations** (e.g., *"postman alternatives"* vs. *"postman alternative"*).  
- ✅ **Automatic Negative Keyword Removal:** If a previously blocked query has a conversion value > $1000 in the last 90 days, it is removed from the negative list.  
- ✅ **Campaign-Specific Execution:** Only runs on the campaigns you declared.

---

## **How It Works**  
### **1. Collects Eligible Keywords**  
- Gathers **enabled keywords** from **active ad groups & campaigns**.  
- Only includes **keywords that have received clicks** in the past 90 days.  

### **2. Analyzes Search Terms (14-Day Conversions)**  
- Fetches queries from the last **14 days**.  
- Tracks conversions and **all conversion value** for each query.  

### **3. Identifies High-Value Queries (90-Day Lookback)**  
- Looks **90 days back** for queries with **all conversion value > $1000**.  
- Removes negative keywords for queries that **now meet this value threshold**.  

### **4. Adds Negative Keywords for Distinct Variants**  
- Compares search queries to active keywords.  
- If a search term is **distinctively different**, it is **added as a negative keyword**.  

---

## **Installation & Setup**  
### **1. Add the Script to Google Ads**  
1. Log in to **Google Ads**.  
2. Navigate to **Tools & Settings → Bulk Actions → Scripts**.  
3. Click **+** to add a new script.  
4. Copy and paste the script into the editor.  

### **2. Adjust Configuration (Optional)**  
Modify the following values at the top of the script:  
| Setting                  | Default Value  | Description |
|--------------------------|---------------|-------------|
| `DRY_RUN`                | `false`       | If `true`, the script will log actions but not apply changes. |
| `NEGATIVE_AT_CAMPAIGN_LEVEL` | `true`   | If `true`, negatives are applied at the campaign level. |
| `CONVERSION_LOOKBACK`    | `LAST_14_DAYS` | How far back to check conversions. |
| `VALUE_LOOKBACK_DAYS`    | `90`           | How far back to check for high conversion value. |
| `VALUE_THRESHOLD`        | `1000`         | Min all conversion value to remove negatives. |

### **3. Set Script Frequency**  
- Recommended: **Run Daily** for optimal performance.  
- Go to **Scripts → Select Script → Edit Frequency → Set to Daily**.  

---

## **Logging & Debugging**  
- **Script logs actions** in the Google Ads script logs.  
- If `DRY_RUN = true`, the script **won’t make changes** but will log intended actions.  

---

## **Expected Outcomes**  
| Scenario | Action |
|----------|--------|
| Query has **conversions** and **high value** (> $1000 in last 90 days) | **Removes from negative list** |
| Query has **no conversions** and is **distinctively different** | **Adds as a negative keyword** |
| Query is **similar to an active keyword** | **No action taken** |
| Query is for a **paused/removed keyword** but had **high value in the past** | **Reactivates keyword / removes negative** |

---

## **FAQ**  
### **Q1: Will the script remove existing negative keywords?**  
Yes, **if a query has generated > $1000 in all conversion value in the last 90 days**, the script **removes it from the negative list**.  

### **Q2: How does the script decide if a search term is similar?**  
It checks if the query is **visually and semantically similar** by:  
1. **Ignoring spacing and minor differences** (e.g., `"test ops"` vs. `"[testops]"`).  
2. **Checking for keyword inclusions** (e.g., `"postman alternatives"` vs. `"postman alternative"`).  

### **Q3: Can I run this script on all campaigns?**  
No, it only runs on specific campaigns declared at `TARGET_CAMPAIGN_NAMES`  

---

## **Support & Customization**  
- **For issues or customization**, modify script settings or contact your **Google Ads manager**.  
- Adjust **campaign names, conversion thresholds, or lookback periods** as needed.  
