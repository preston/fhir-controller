# Skycapp FHIR Stack Controller

This base image, intended to be directly extended with your own data files, provides a simple web UI for bootstrapping a freshly booted FHIR server by:

1. Loading a preset sequence of FHIR bundles to a given FHIR server in sequence.
1. Expunging all records on that FHIR servers, effectively "resetting" the FHIR server to a default state. (Requires the FHIR server to support the $expunge operation.
1. Ordered resource links to guide the user through initial usage.

The stack controller operates purely in-browser and makes all FHIR API calls via REST. There are no other server-side API calls.

## Configuring and Running Your Own Stack Controller

When the stack controller loads, must be provided a configuration file either by:

1. Overriding the `stack.json` file in the base image at image boot time, or
1. Using a `url` query string parmater at page load time that points to a valid alternative configuration file, such as `?url=http://your.example.com/stack.json`.

### Building Your Own Image Configuration

See https://github.com/asushares/stack for a working example of how to use this image. The general steps are:

1. Put your JSON FHIR bundle files in the `/public` directory. Everything you place here will be copied into the image and downloadable from the root `/` path.
1. Create a `stack.json` file defining the controller name, data file load order, and other metadata.
1. Build it! Once running, it can be used as a UI for FHIR data bundle loading and FHIR server resets. Note: "Expunging" data requires your FHIR server to support the "$expunge" operation. 

See [stack.schema.json](public/stack.schema.json) for the JSON schema.

## License

Provide under the Apache 2.0 license. Copyright © 2024 Preston Lee. All rights reserved.

