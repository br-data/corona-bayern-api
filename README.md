# Corona Bayern Scraper

## Daten

## API

- `/`: alle verfügbaren Daten abrufen
- `/date`: aktuellste Daten für alle Landkreise abrufen
- `/date/[date]`: Daten für ein spezifische Datum für alle Landkreise abrufen, z.B. `2020-03-18`
- `/county`: alle Daten für alle Landkreise abrufen
- `/county/[id]`: Daten für einen Landkreis abrufen, z.B. `amberg-sulzbach`

## Deployment

## Testing

```console
$ npm i -g @google-cloud/functions-framework
```

```console
$ functions-framework --target=api
```

```console
$ curl -X GET 'localhost:8080?date=2020-03-18'
```
