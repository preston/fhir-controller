import { DriverType } from "./driver_type";
import { GenericDriver } from "./generic_driver";

export class FhirCandleDriver extends GenericDriver {

    public override name: string = 'FHIR Candle';
    public override code: string = DriverType.FHIRCandle;

}