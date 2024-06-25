// Author: Preston Lee

import { DataFile } from "./data_file";
import { Link } from "./link";

export class StackConfiguration {

    public title: string = 'Stack Controller';
    public instructions: string = '';
    public data: DataFile[] = [];
    public fhir_base_url: string = '';
    public links: Link[] = [];

}