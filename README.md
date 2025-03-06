# google-leads-exact-match
Fed up with Exact Match’s flaws, I built a script to fix it. The catch? You must first pay for a bogus click before it appears in your search terms report. Once it does, the script auto-blocks it as a negative keyword.

Here’s a quick rundown of what it does:

DRY_RUN: If set to true, it only logs what would be blocked, without actually creating negatives.
NEGATIVE_AT_CAMPAIGN_LEVEL: If true, negatives are added at the campaign level. If false, they’re added at the ad group level.
DATE_RANGES: By default, it checks both TODAY and LAST_7_DAYS for new queries.
Singular/Plural Matching: It automatically allows queries that differ only by certain known plural forms (like “shoe/shoes” or “child/children”), so you don’t accidentally block relevant searches.
Duplication Checks: It won’t create a negative keyword that already exists.

Instructions to set it up:
In your Google Ads account, go to Tools → Bulk Actions → Scripts.
Add a new script, then paste in the code below.
Set your desired frequency (e.g., Hourly, Daily) to run the script.
Review and tweak the config at the top of the script to suit your needs.
Preview and/or run the script to confirm everything is working as intended.
