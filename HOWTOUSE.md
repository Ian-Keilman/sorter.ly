# Using sorter.ly

## Create a collection (database)

Right under "sorter.ly" on the top left is a button that says "+ New Collection" and clicking it lets you choose a name for the colection, along with a description.

Example:

I'll create a collection titled "Candies" and the description will be "List of candies that I've tried, plan to try, how good they taste, and how much they cost."

## Rename a collection

Open the collection, select "Edit Fields," then edit the collection name or description in the Collection section. Renaming a collection does not change its records.

## Add fields (parameter)

Once the collection is created, you're taken to the page for that collection, and you'll see a box that says "Fields" and "No fields" and a button that says "edit" on the right. 
Click on edit to add any type of field of your choice, and choose the field type accordingly. There are four different field types: Text, number, date, and boolean
In addition, you can set certain fields to be optional, while others are required. As of v0.1.2, required and typed values are checked by the app itself too, rather than just hoping the browser was paying attention.

Example:
For my "Candies" collection, my fields would be this:
- Name of candy (text) (required)
- Have I tried the candy yet? (boolean) (required)
- The day that I tried the candy (date) (not a required field)
- How good candy tastes on a scale of 1-10 (number) (not a required field)
  
## Add records (entries)

Below fields, you can add records, which are simply just individual entries for your collection. 

Example:

Name - Gumdrops

Already tried - True

Date tried - 2026-03-22

Tastiness (out of ten) - 2


### Sorting

Within the records tab, there are arrows next to each of your custom fields. By default, all your records are organized in the order that you added them.
A double-sided arrow next to the field name means that it's not being utilized, but if you click it, it'll turn it into an upwards arrow, and then a downwards arrow, depending on how you want to sort.

As of v0.1.1, you can sort by one field at a time. Clicking a different field makes it the active sort.

### Filtering

The option "Filters" is right above fields, and it's just a ctrl + f feature that lets you find specific text within a field of your choice.

### Importing/Exporting CSV files

The top right has "Import CSV" and "Export CSV", which should be pretty self-explanitory. These .csv files are compatible with Excel and Sheets.

Matching CSV headers reuse existing fields, and new headers create text fields. Duplicate headers are kept as separate fields with numbered names.

Imports can be up to 5 MB and 10,000 data rows. Existing number, date, boolean, and required fields are validated before anything is saved. If one row is invalid, nothing is imported, which is much better than receiving 9,999 records and one mystery.

Dates use the `YYYY-MM-DD` format. Boolean CSV values can use true/false, yes/no, y/n, or 1/0.

CSV stores rows and values only. Spreadsheet formatting, charts, formulas, and images are not imported.
