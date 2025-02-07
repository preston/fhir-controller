# Skycapp FHIR Stack Controller

This base image, intended to be directly extended with your own data files, provides a simple web UI for bootstrapping a freshly booted FHIR server by:

1. Presenting your Markdown-formatted instructions or tutorial. 
1. Loading a preset sequence of FHIR bundles to a given FHIR server in order.
1. Providing ordered resource links to guide the user through initial usage.
1. Deleting of all records en masse, if supported by the server driver. Currently this is only supported by the HAPI driver that relies on a HAPI-specific "$expunge" operation.

The stack controller operates purely in-browser and makes all FHIR API calls via REST. There are no other server-side API calls.

## Configuring and Running Your Own Stack Controller

When the stack controller loads, must be provided a configuration file either by:

1. Overwriting the `stack.json` file in the base image at image boot time, or
1. Using a `url` query string parmater at page load time that points to a valid alternative configuration file, such as `?url=http://your.example.com/stack.json`.

### Building Your Own Image Configuration

See https://github.com/asushares/stack for a working example of how to create a Dockerfile using this base image. The general steps are:

1. Copy your files into the image, e.g. `COPY /whatever .`. The contents copied into the image will be downloadable from the root `/` path.
1. Create and copy in a `stack.json` file defining the controller name, data file load order, and other metadata to load by default.
1. Build it! Once running, it can be used as an entrypoint UI for building a tutorial of using your application stack with built-in FHIR data bundle loading and FHIR server resets. Note: "Expunging" data requires your FHIR server to support the "$expunge" operation. 

See [stack.schema.json](public/stack.schema.json) for the JSON schema.

## License

Provide under the Apache 2.0 license. Copyright © 2024 Preston Lee. All rights reserved.
