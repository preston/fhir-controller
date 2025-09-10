// Author: Preston Lee

import { LoaderType } from "./loader_type";
import { Scenario } from "./scenario";

export class DataFile {

    // Set via the data schema.
    public file: string = '';
    public load: boolean = true;
    public loader: LoaderType = LoaderType.FHIR_BUNDLE;
    public name: string = '';
    public description: string = '';
    public type: string = '';
    public priority: number = 1;
    public evaluate: EvaluateOptions | null = null;
    public scenarios: string[] = [];

    // Set by the application.
    // public loaded: boolean = false;
}

export class EvaluateOptions {
    public id: string | null = null;
    public subjects: { id: string, name: string }[] = [];
}