// Author: Preston Lee

import { LoaderType } from "./loader_type";

export class DataFile {
    public file: string = '';
    public load: boolean = true;
    public loader: LoaderType = LoaderType.FHIR_BUNDLE;
    public name: string = '';
    public description: string = '';
    public type: string = '';
    public priority: number = 1;
}