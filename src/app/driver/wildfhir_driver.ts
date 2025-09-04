// Author: Preston Lee

import { DriverType } from "./driver_type";
import { GenericDriver } from "./generic_driver";

export class WildFhirDriver extends GenericDriver {

    public override name: string = 'WildFHIR';
    public override code: string = DriverType.WildFHIR;

    override supports_reset(): boolean {
        return true;
    }

    override reset() {
        let data = {};
        return this.http.post(this.stack_configuration.fhir_base_url + '/$purge-all', data);
    }

}