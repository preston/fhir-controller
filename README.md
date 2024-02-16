# ASU SHARES CDS Consent Sandbox

This project provides a turnkey CDS sandbox for locally running the [ASU SHARES](https://www.asushares.com) software stack, as well as seed data for building your own custom use cases.

```sh
docker compose -f docker-compose.yml up
```


| URL                   | Service           | Purpose       | Source Code   |
|----                   |----               |----           |----           |
| http://localhost:4200 | Patient Portal    | Patient-facing simple consent editor | https://github.com/asushares/patient
| http://localhost:4201 | Consent Manager   | Provider-facing complex consent editor  | https://github.com/asushares/consent-manager
| http://localhost:4202 | Rules Editor      | Patient-facing consent editor | https://github.com/asushares/rules
| http://localhost:3000 | CDS Engine        | SHARES CDS Hooks service | https://github.com/asushares/cds
| http://localhost:8080 | FHIR Server       | Underlying FHIR data repository | https://github.com/hapifhir/hapi-fhir
