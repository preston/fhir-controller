# FHIR Controller :: Data Loading, CQL Explorer and Utility UI

[![Build Status](https://ci.prestonlee.com/api/badges/preston/fhir-controller/status.svg)](https://ci.prestonlee.com/preston/fhir-controller)

FHIR Controller is a base standalone web application image providing a simple web UI for bootstrapping a freshly booted FHIR server. Just drop your FHIR data bundles and CQL files into a [child project](https://github.com/preston/fhir-controller-template) and extend the [base Docker image](https://hub.docker.com/r/p3000/fhir-controller/tags). You'll get:

1. An HTML rendering of your Markdown-formatted instructions or tutorial and supplemental links.
2. Data loader utility for seeding your FHIR Bundles and CQL files in sequence to a default FHIR base URL.
3. Server reset button for restoring the server to a default state, if supported by the server. Deletion of all records en masse is not a standard FHIR operation and requires the server driver support to support it: currently HAPI and WildFHIR drivers.

The stack controller operates purely in-browser and makes all FHIR API calls via REST. There are no other server-side API calls.

## Configuring and Running Your Own Stack Controller

When the stack controller loads, must be provided a configuration file either by:

1. Overwriting the `stack.json` file in the base image at image boot time, or
1. Using a `url` query string parmater at page load time that points to a valid alternative configuration file, such as `?url=http://your.example.com/stack.json`.

### Building Your Own Image Configuration

See https://github.com/asushares/stack for a working example of how to create a Dockerfile using this base image. The general steps are:

1. Copy your data files into the image, e.g. `COPY /whatever .`. All files copied into the image will be downloadable from the root `/` path.
2. Include a copy of a `stack.json` file defining the controller name, data file load order, and other metadata to load by default.
3. Build it! Once running, it can be used as an entrypoint UI for building a tutorial of using your application stack with built-in FHIR data bundle loading and FHIR server resets. Note: "Expunging" data requires a supported non-standard operation of the underlying FHIR server.

See [stack.schema.json](src/assets/stack.schema.json) for the JSON schema.

## License

Provide under the Apache 2.0 license. Copyright © 2024-2025 Preston Lee. All rights reserved.
