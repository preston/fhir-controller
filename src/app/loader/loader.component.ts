// Author: Preston Lee

import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { MomentModule } from 'ngx-moment';
import { MarkdownComponent } from 'ngx-markdown';
import { ToastrService } from 'ngx-toastr';

import { DataFile } from './data_file';
import { LoaderMessage } from './loader_message';
import { StackConfiguration } from './stack_configuration';
import { ActivatedRoute } from '@angular/router';
import { GenericDriver } from '../driver/generic_driver';
import { HapiFhirDriver } from '../driver/hapi_driver';
import { WildFhirDriver } from '../driver/wildfhir_driver';
import { DriverType } from '../driver/driver_type';
import { FhirCandleDriver } from '../driver/fhir_candle_driver';
import { LoaderType } from './loader_type';

@Component({
	selector: 'loader',
	standalone: true,
	imports: [CommonModule, FormsModule, MomentModule, MarkdownComponent],
	providers: [],
	templateUrl: './loader.component.html',
	styleUrl: './loader.component.scss'
})
export class LoaderComponent implements OnInit {


	evaluateSubject: string | null = null;

	// name = (window as any)["STACK_CONTROLLER_NAME"] || 'Stack Controller';
	// fhir_base_url = (window as any)["FHIR_BASE_URL"];

	development: boolean = false;

	configuration_file = 'stack.json';
	// configuration_file_url: string | undefined;

	stack_configuration: StackConfiguration = new StackConfiguration();

	// default_files: DataFile[] = [
	// ]
	// driver_type: DriverType = DriverType.Generic;
	driver: GenericDriver = new GenericDriver(this.stack_configuration, this.http);

	files_to_load: DataFile[] = [];
	state: 'default' | 'loading' | 'loaded' = 'default';
	errors: boolean = false;

	messages: LoaderMessage[] = [];


	constructor(
		protected http: HttpClient,
		protected route: ActivatedRoute,
		protected toastrService: ToastrService
	) {
	}


	ngOnInit() {
		let url = this.route.queryParams.subscribe({
			next: (params) => {
				let url = params["url"];
				if (url) {
					console.log('Loading from URL: ' + url);
					this.configuration_file = url;
					this.http.get<StackConfiguration>(this.configuration_file).subscribe({
						next: (data => {
							this.loadStackConfiguration(data);
						}),
						error: (e => {
							this.toastrService.warning("The remote file URL couldn't be loaded, sorry. Check the URL and your connectivity and try again.", "Couldn't load URL");
						})
					});
				} else {
					console.log('No URL provided. Loading for default configuration file.');
					this.reloadStackConfiguration();
				}
			}
		}
		);
	}
	changeDriver() {
		switch (this.stack_configuration.driver) {
			case DriverType.Hapi:
				this.driver = new HapiFhirDriver(this.stack_configuration, this.http);
				console.log('Using HAPI driver.');
				break;
			case DriverType.WildFHIR:
				this.driver = new WildFhirDriver(this.stack_configuration, this.http);
				console.log('Using WildFHIR driver.');
				break;
			case DriverType.FHIRCandle:
				this.driver = new FhirCandleDriver(this.stack_configuration, this.http);
				console.log('Using FHIR Candle driver.');
				break;
			default:
				// Use the generic driver by default.
				this.stack_configuration.driver = DriverType.Generic;
				this.driver = new GenericDriver(this.stack_configuration, this.http);
				console.log('Using generic driver.');
				break;
		}
	}

	driverTypes() {
		return DriverType;
	}

	reloadStackConfiguration() {
		this.http.get<StackConfiguration>(this.configuration_file).subscribe({
			next: data => {
				this.loadStackConfiguration(data);
			}, error: error => {
				console.error('Error loading configuration file: ' + this.configuration_file);
				console.error(error);
				this.errors = true;
				this.messages.unshift({ type: 'danger', body: 'Error loading configuration file: ' + this.configuration_file, date: new Date() });
				this.toastrService.error('Could not load configuration file: ' + this.configuration_file, 'Error Loading Configuration');
			}
		});

	}

	loaderTypes() {
		return LoaderType;
	}


	loadStackConfiguration(data: StackConfiguration) {
		this.stack_configuration = data;
		const tmp: DataFile[] = JSON.parse(JSON.stringify(this.stack_configuration.data));
		this.files_to_load = tmp.sort((a, b) => { return a.priority - b.priority });
		this.state = 'default';
		this.changeDriver();
		this.messages.unshift({ type: 'info', body: 'Controller configuration has been reloaded.', date: new Date() });
	}

	load() {
		this.state = 'loading';
		this.messages.unshift({ type: 'info', body: 'Starting load operations...', date: new Date() });
		let filtered = this.files_to_load.filter(f => { return f.load });
		console.log('Loading ' + filtered.length + ' files...');
		this.loadNextFile(filtered);
	}

	loadNextFile(files: DataFile[]) {
		let headers = new HttpHeaders();
		headers = headers.set('Accept', 'application/json');
		headers = headers.set('Content-Type', 'application/json');
		let next = files.shift();
		if (next) {
			// if (next && !next.file.startsWith('http://') && next.file.startsWith('https://')) {
			// if (next.file.startsWith('https://')) {
			//   next = Object.assign({}, next);
			//   next.file = window.location.href + '/' + next.file;
			//   console.log('Adjusted file path: ' + next.file);
			// }
			// If the controller configuration file was loaded from a URL *and* the next file is a relative path,
			// then we need to adjust the path to be relative to where the controller configuration file was loaded from.
			if (this.configuration_file.startsWith('http') && !next.file.startsWith('http')) {
				// TODO There is probably a better way to do this.
				let base_url = this.configuration_file.substring(0, this.configuration_file.lastIndexOf('/'));
				next.file = base_url + '/' + next.file;
			}

			// Download it into browser memory.
			this.http.get(next.file, { responseType: 'text' }).subscribe({
				next: data => {
					// console.log('Downloaded file: ' + next.file);
					// console.log(data);
					console.log('Loading file : ' + next.file + ' with loader type: ' + next.loader);
					switch (next.loader) {
						case LoaderType.CQL_AS_FHIR_LIBRARY:
							let info = this.extractCqlLibraryNameAndVersion(data as string);
							if (info) {
								// let libraryName = info.libraryName;
								// let version = info.version;
								let description = next.description || 'CQL Library loaded from file: ' + next.file;
								// let base64Content = btoa(data as string);
								let libraryResource = this.buildLibraryResource(info.libraryName, info.version, description, data);
								this.http.put(this.stack_configuration.fhir_base_url + '/Library/' + info.libraryName, libraryResource, { headers: headers }).subscribe({
									next: data => {
										// next.id = info.libraryName;
										this.toastrService.success(next.file, 'Loaded ' + next.name);
										this.messages.unshift({ type: 'success', body: 'Loaded ' + next.file, date: new Date() });
										console.log('Loaded: ' + next.file);
										this.loadNextFile(files);
									}, error: error => {
										this.toastrService.error(next.file, 'Error Loading CQL Library');
										this.messages.unshift({ type: 'danger', body: 'Could not load ' + next.file, date: new Date() });
										console.error('Error loading file: ' + next.file);
										console.error(error);
										this.state = 'loaded';
									}
								});
							} else {
								this.toastrService.error(next.file, 'Could not extract CQL library name and version');
								this.messages.unshift({ type: 'danger', body: 'Could not extract CQL library name and version from file: ' + next.file, date: new Date() });
								console.error('Could not extract CQL library name and version from file: ' + next.file);
								this.state = 'loaded';
							}
							// this.buildFHIRBundle()
							break;
						case LoaderType.FHIR_BUNDLE:
						// This is also the default loader type, so flow through.
						default:
							this.http.post(this.stack_configuration.fhir_base_url, data, { headers: headers }).subscribe({
								next: data => {
									this.toastrService.success(next.file, 'Loaded ' + next.name);
									this.messages.unshift({ type: 'success', body: 'Loaded ' + next.file, date: new Date() });
									console.log('Loaded: ' + next.file);
									this.loadNextFile(files);
									// console.log(data);
								}, error: error => {
									this.toastrService.error(next.file, 'Error Loading FHIR Bundle');
									this.messages.unshift({ type: 'danger', body: 'Could not load ' + next.file, date: new Date() });
									console.error('Error loading file: ' + next.file);
									console.error(error);
									this.state = 'loaded';
								}
							});
							break;
					}
				}, error: error => {
					this.toastrService.error(next.file, 'File Not Downloaded');
					this.messages.unshift({ type: 'danger', body: 'Could not download ' + next.file, date: new Date() });
					console.error('Error downloading file: ' + next.file);
					console.error(error);
					this.state = 'loaded';
				}
			});
		} else {
			this.messages.unshift({ type: 'info', body: 'Complete. Please check for errors. ', date: new Date() });
			this.state = 'loaded';
		}
	}

	toggleSelected() {
		this.files_to_load.forEach(f => {
			f.load = !f.load;
		});

	}

	resetServerData() {
		this.driver.reset().subscribe({
			next: data => {
				this.toastrService.success('Server reports that all data has been reset!', 'Expunge');
				this.messages.unshift({ type: 'success', body: 'Server reset successful', date: new Date() });
				console.log('Expunge successful');
				console.log(data);
			}, error: error => {
				this.toastrService.error('The server return an error from the data reset attempt.', 'Error Expunging');
				this.messages.unshift({ type: 'danger', body: 'Error reseting data', date: new Date() });
				console.error('Error expunging');
				console.error(error);
			}
		});
	}

	test() {
		this.toastrService.success('Yay.', 'Test Message');
		this.messages.unshift({ type: 'info', body: 'It works.', date: new Date() });
	}

	createEvaluateParameters(subject: string) {
		const parameters = {
			resourceType: 'Parameters',
			parameter: [
				// { name: 'url', valueUri: `http://localhost:8080/fhir/Library/${libraryId}` },
				// { name: 'library', valueString: libraryId },
				// { name: "useServerData", valueBoolean: true },
				{
					name: "subject",
					valueString: subject
				}]
		};
		return parameters;
	}

	extractCqlLibraryNameAndVersion(content: string) {
		const libraryRegex = /^library\s+(\w+)\s+version\s+'([^']+)'/m;
		const match = content.match(libraryRegex);
		if (match) {
			const libraryName = match[1];
			const version = match[2];
			return { libraryName, version };
		} else {
			return null;
		}
	}

		buildLibraryResource(libraryName: string, version: string, description: string, cql: string) {
		let encoded = btoa(cql); // Ensure cql is base64 encoded
		const libraryResource = {
			resourceType: 'Library',
			type: {},
			id: libraryName,
			version: version,
			name: libraryName,
			title: libraryName,
			status: 'active',
			description: description,
			url: `${this.stack_configuration.fhir_base_url}/Library/${libraryName}`,
			content: [
				{
					contentType: 'text/cql',
					data: encoded, // Use base64 encoded CQL
				},
			],
		};
		return libraryResource;
	}

	// buildFHIRBundle(
	// 	libraryName: string,
	// 	version: string,
	// 	description: any,
	// 	base64Content: string,
	// 	baseUrl: string
	// ) {
	// 	const libraryResource = {
	// 		resourceType: 'Library',
	// 		id: libraryName,
	// 		url: `${baseUrl}Library/${libraryName}`,
	// 		version: version,
	// 		name: libraryName,
	// 		title: libraryName,
	// 		status: 'active',
	// 		description: description,
	// 		content: [
	// 			{
	// 				contentType: 'text/cql',
	// 				data: base64Content,
	// 			},
	// 		],
	// 	};

	// 	const bundle = {
	// 		resourceType: 'Bundle',
	// 		type: 'transaction',
	// 		entry: [
	// 			{
	// 				resource: libraryResource,
	// 				request: {
	// 					method: 'POST',
	// 					url: `Library/${libraryName}`,
	// 				},
	// 			},
	// 		],
	// 	};
	// 	return bundle;
	// }

	evaluateCql(file: DataFile) {

		if (!this.evaluateSubject) {
			this.toastrService.error('Please select a subject to evaluate the CQL against.', 'No Subject Selected');
			this.messages.unshift({ type: 'danger', body: 'No subject selected for evaluation.', date: new Date() });
			return;
		} else if (!file.evaluate || !file.evaluate.id) {
			this.toastrService.error('The CQL file does not have an Library ID set.', 'No Library ID');
			this.messages.unshift({ type: 'danger', body: 'CQL file does not have an evaluation ID set.', date: new Date() });
			return;
		} else {
			this.createEvaluateParameters(this.evaluateSubject);
			this.http.post(this.stack_configuration.fhir_base_url + '/Library/' + file.evaluate.id + '/$evaluate', this.createEvaluateParameters(this.evaluateSubject), { headers: new HttpHeaders({ 'Content-Type': 'application/fhir+json' }) }).subscribe({
				next: (data) => {
					this.toastrService.success(`${this.evaluateSubject}\n${data}`, 'CQL $evaluate Success');
					this.messages.unshift({ type: 'success', body: 'CQL $evaluate Success' + `\n${JSON.stringify(data, null, 2)}`, date: new Date() });
					console.log('CQL evaluation successful:', data);
				}
				, error: (error) => {
					this.toastrService.error('CQL evaluation failed for subject: ' + this.evaluateSubject, 'CQL Evaluation Error');
					this.messages.unshift({ type: 'danger', body: 'CQL evaluation failed for subject: ' + this.evaluateSubject, date: new Date() });
					console.error('CQL evaluation error:', error);
				}
			});
		}
	}


}
