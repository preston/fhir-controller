#!/bin/sh
curl -X POST -H 'Content-Type: application/json' -d @data/hospitalInformation1671557337568.json  http://localhost:8080/fhir
curl -X POST -H 'Content-Type: application/json' -d @data/hospitalInformation1671557444542.json  http://localhost:8080/fhir
curl -X POST -H 'Content-Type: application/json' -d @data/practitionerInformation1671557337568.json  http://localhost:8080/fhir
curl -X POST -H 'Content-Type: application/json' -d @data/practitionerInformation1671557444542.json  http://localhost:8080/fhir

