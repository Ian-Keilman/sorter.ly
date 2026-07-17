## Scope of sorter.ly

#### v0.1.2

- Adding a new field calling "rating." Pretty self-explanitory. Rather than typing a number into a text field, you can simply open a quick drop-down menu to rate whatever item you have in your collection, out of 5, 10, or 100. Decimals should work.
- Default values. This should be useful for boolean fields, where if you don't type anything, the value can automatically be set to yes or no, true or false, etc.
- Detect duplicate records, regardless of whether you enter it yourself, or import it via CSV. Option to ignore duplicate records.

#### v0.1.3

- New field for images; just small jpg and png images to start. Perhaps larger images, more formats, and videos will come in a later patch.
- Easier navigation through collections: Instead of a list, there will be rows and columns of squares showing each of your entries, and clicking on the name of the entry will show its fields and values
- This change is partially to accommodate the additionn of images.
- If you've ever played modern Dance Dance Revolution, it'll be an interface similar to that.

#### v0.1.4

- Huge UI/UX improvement. The site should look like a real product, rather than a "please give me internships" project.
- Text should look better, and perhaps a "how to use" page.
- Perhaps a real home page as well.
  
#### v0.1.5

- More file formats?
- Perhaps a file format specific to sorter.ly to share collections with other people/devices yourself. Currently thinking of a good file name.

#### v0.2.0

- Online website, with accounts and passwords.
- Option to store everything locally will stay

#### v1.0.0

- The full release should be compatible between different devices. You should be able to work on your home computer, phone, tablet, and laptop if you feel like it.
- Android and Mac support, hopefully iOS as well

#### v1.1.0

- AI, someday

## Platform direction

- Keep the current Next.js and SQLite application focused on a dependable local desktop experience throughout v0.1.x.
- Before native packaging, move collection and record rules behind a small platform-neutral data layer. The UI should not need to know whether data comes from the current Next.js server actions or a native SQLite adapter.
- Evaluate Tauri 2 with its SQLite plugin for a shared macOS and iOS application. This is a candidate, not a commitment; the current server-action architecture cannot be packaged as a static mobile app without that separation work.
- Treat multi-device sync as a separate feature from device compatibility. A native app should remain useful and private with no account or network connection.

## Future update suggestions

- Add import preview, validation results, and a clear summary before changing a collection.
- Add automatic local backups plus trash or undo before expanding destructive editing.
- Allow fields to be renamed, reordered, and safely converted between compatible types.
- Add saved filters and views, then pagination or virtualization for large collections.
- Define a versioned sorter.ly interchange format that includes field definitions as well as records.
- Define sync conflict rules and encryption before adding accounts or cloud storage.
