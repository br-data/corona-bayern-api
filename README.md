# Corona Bayern Scraper

## Daten

<https://www.lgl.bayern.de/gesundheit/infektionsschutz/infektionskrankheiten_a_z/coronavirus/karte_coronavirus/index.htm>

## API

#### Endpunkte

- `/`: alle verfügbaren Daten abrufen
- `/date`: aktuellste Daten für alle Landkreise abrufen
- `/date/[date]`: Daten für ein spezifische Datum für alle Landkreise abrufen, z.B. `2020-03-18`
- `/county`: Daten für alle Landkreise abrufen
- `/county/[id]`: Daten für einen Landkreis abrufen, z.B. `amberg-sulzbach`

#### Parameter

- `?filetype=csv`: Daten als CSV-Tabelle zurückgeben

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

## To Do

- Fälle pro 1.000 Einwohner hinzufügen
- Daten den gestrigen Tags zurückgeben, falls keine Daten für den heutige Tag verfügbar sind,
- Amtliche Gemeindeschlüssel (AGS) für Landkreise und kreisfreie Städte hinzufügen
- Dokumenten-ID den Landkreise und kreisfreie Städte hinzufügen ({id: amberg-sulzbach})
