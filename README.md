# Skycapp FHIR Stack Controller

This base image project provides a simply web UI for bootstrapping a freshly booted FHIR server by:

1. Loading a preset sequence of FHIR bundles to a given FHIR server in sequence.
1. Expunging all records on that FHIR servers, effectively "resetting" the FHIR server to a default state. (Requires the FHIR server to support the $expunge operation.
1. Ordered resource links to guide the user through initial usage.

The stack controller operates purely in-browser and makes all FHIR API calls via REST. There are no other server-side API calls. When the stack controller loads, must be provided a configuration file either by:

1. Overriding the stack.json file in the base image, or
1. Using a `url` query string parmater pointing to a valid configuration file, such as `?url=http://your.example.com/stack.json`.

See [stack.schema.json](public/stack.schema.json) for the JSON schema.

## License

Provide under the Apache 2.0 license. Copyright © 2024 Preston Lee. All rights reserved.

