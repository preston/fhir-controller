// Author: Preston Lee

import { HttpClient } from "@angular/common/http";
import { StackConfiguration } from "../loader/stack_configuration";
import { Observable } from "rxjs";
import { DriverType } from "./driver_type";

export class GenericDriver {

    public name: string = 'Generic';
    public code: string = DriverType.Generic;

    constructor(public stack_configuration: StackConfiguration, public http: HttpClient) {

    }

    supports_reset() {
        return false;
    }

    supports_cql_libraries(): boolean {
        return false;
    }

    supports_cql_evaluate(): boolean {
        return false;
    }


    reset(): Observable<any> {
        throw new Error('Reset not implemented by this driver.');
    }

}