# FHIR Stack Controller

This base image project provides a simply web UI for bootstrapping a freshly booted FHIR server by:

1. Loading a preset sequence of FHIR bundles to a given FHIR server in sequence.
1. Expunging all records on that FHIR servers, effectively "resetting" the FHIR server to a default state. (Requires the FHIR server to support the $expunge operation.

It must be provided a configuration file containing:

* Application title and instructive text.
* References to each data file in sequence.
* Links for 
