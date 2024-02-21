# SimpleTransfer (backend)

## Concept
- Copy files to transfer to the server's "dropbox" directory by any way you want and your server allows (rsync, scp, ftp, etc.);
- Create a transfer picking a file or directory in the "dropbox":
    - Add object and message;
    - Add recipients emails;
- File or directory is zipped then move to "transfers" directory (original files and folders in "dropbox" remain untouched, you have to delete them your self if needed);
- A mail is send to each recipients, with a unique download url;
- When a recipient downloaded the transfer, a mail is send to transfer's owner;

It's meant to be a simple tool for personnal use:
- No transfer size limit;
- No recipients number limit;
- No transfer expiration date, transfers can be deactivated or deleted manually;

## API
- `/api/transfers` GET method, returns all transfers, sorted by creation date (TODO: pagination);
- `/api/transfers` POST method, create a new transfer:
```
{
    email: "sender@example.com", // sender's email, required
    object: "My object", // email's object, required
    message: "My message", // email's message, required
    dropfile: "my_folder", // filename, must be on "dropbox"'s root, required
}
```
- `/api/transfers/<transfer_uuid>` GET method, returns a transfer detail, with nested recipients list;
- `/api/transfers/<transfer_uuid>` PUT method, update a transfer (sender email or active status):
```
{
    email: "newsender@example.com", // new sender's email, optional
    active: false, // transfer status, optional (defaults to true)
}
```
- `/api/transfers/<transfer_uuid>` DELETE method, delete a transfer, all its recipients, remove archive file (recipients will see a 404 not found page if they try to download the transfer after that);
- `/api/recipients` POST method, create a new recipient:
```
{
    email: "recipient@example.com", // recipient's email, required
    transfer: "<transfer_uuid>", // transfer's uuid, required
    active: false, // recipients status, optional (defaults to true)
}
```
- `/api/recipients/<recipient_uuid>` PUT method, update a recipient:
```
{
    active: false, // recipients status
}
```
- `/api/listdropbox` GET method, list "dropbox" directory content, returns:
```
[
    { name: "my_file.pdf", isDirectory: false },
    { name: "my_directory", isDirectory: true },
]
```

