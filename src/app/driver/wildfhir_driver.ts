// Author: Preston Lee

import { GenericDriver } from "./generic_driver";

export class WildFhirDriver extends GenericDriver {

    public override name: string = 'WildFHIR';

    override supports_reset(): boolean {
        return true;
    }

    override reset() {
        let data = {};
        return this.http.post(this.stack_configuration.fhir_base_url + '/$purge-all', data);
    }

}