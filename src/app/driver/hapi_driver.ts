// Author: Preston Lee

import { GenericDriver } from "./generic_driver";

export class HapiFhirDriver extends GenericDriver {

    public override name: string = 'HAPI';

    override supports_reset(): boolean {
        return true;
    }

    override supports_cql_libraries(): boolean {
        return true;
    }

    override supports_cql_evaluate(): boolean {
        return true;
    }
    
    override reset() {
        let data = {
            "resourceType": "Parameters",
            "parameter": [
                {
                    "name": "expungeEverything",
                    "valueBoolean": true
                }
            ]
        }
        return this.http.post(this.stack_configuration.fhir_base_url + '/$expunge', data);
    }
}