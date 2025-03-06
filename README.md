# google-leads-exact-match
Fed up with Exact Match’s flaws, I built a script to fix it. The catch? You must first pay for a bogus click before it appears in your search terms report. Once it does, the script auto-blocks it as a negative keyword.

Here’s a quick breakdown of the script’s functionality:  

- **DRY_RUN**: Logs blocked terms without actually adding negatives when set to `true`.  
- **NEGATIVE_AT_CAMPAIGN_LEVEL**: Adds negatives at the campaign level if `true`; otherwise, at the ad group level.  
- **DATE_RANGES**: Checks search terms from **TODAY** and the **LAST_7_DAYS** by default.  
- **Singular/Plural Matching**: Prevents blocking queries that differ only by common plural forms (e.g., *shoe/shoes*).  
- **Duplication Checks**: Avoids creating negatives that already exist.  

### Setup Instructions:  
1. In Google Ads, go to **Tools → Bulk Actions → Scripts**.  
2. Create a new script and paste in the code.  
3. Set the run frequency (e.g., **Hourly, Daily**).  
4. Adjust the script’s configuration to fit your needs.  
5. Preview and run to ensure it works correctly.
