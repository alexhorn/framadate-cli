# framadate-cli

CLI client for Framadate

## Examples

Create a poll with options from next monday until friday at 15:00 and 20:00 on the Framadate installation hosted by Digitalcourage:
```
npx github:alexhorn/framadate-cli \
  --framadate 'https://nuudel.digitalcourage.de' \
  --title 'Example poll' \
  --name 'John Doe' \
  --email 'john@example.com' \
  mo-fr 15:00,20:00
```
