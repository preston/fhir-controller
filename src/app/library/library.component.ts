// Author: Preston Lee

import { Component, OnChanges, SimpleChanges } from '@angular/core';
import { Library, Bundle } from 'fhir/r4';
import { LibraryService } from '../library.service';
import { ToastrService } from 'ngx-toastr';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Highlight } from 'ngx-highlightjs';
import { Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';

@Component({
	selector: 'logic-component',
	imports: [FormsModule, CommonModule, Highlight],
	templateUrl: 'library.component.html',
	styleUrl: 'library.component.scss'
})
export class LibraryComponent implements OnChanges {


	public library: Library | null = null;

	protected cql: string | null = null;
	public static DEFAULT_LIBRARY_NAME: string = '';
	public static DEFAULT_LIBRARY_VERSION = "0.0.0";
	public libraryVersion: string = LibraryComponent.DEFAULT_LIBRARY_VERSION;
	public libraryDescription: string = "";

	// Search functionality
	public searchTerm: string = "";
	public searchResults: Library[] = [];
	public isSearching: boolean = false;
	public showSearchResults: boolean = false;
	private searchSubject = new Subject<string>();

	// Library state tracking
	public isNewLibrary: boolean = false;
	public hasSelectedLibrary: boolean = false;

	constructor(
		protected libraryService: LibraryService,
		protected toastrService: ToastrService) {
		// this.libraryService.libraryId = LibraryService.DEFAULT_LIBRARY_ID;
		console.log('LibraryComponent initialized');
		// this.reloadLibraryFromServer();
		// this.reloadExampleCql();

		// Set up live search with debouncing
		this.searchSubject.pipe(
			debounceTime(100), // Wait 300ms after user stops typing
			distinctUntilChanged(), // Only emit if the value has changed
			switchMap(searchTerm => {
				if (searchTerm.trim()) {
					this.isSearching = true;
					return this.libraryService.search(searchTerm);
				} else {
					this.isSearching = false;
					this.showSearchResults = false;
					this.searchResults = [];
					return [];
				}
			})
		).subscribe({
			next: (bundle: Bundle<Library>) => {
				this.isSearching = false;
				if (bundle.entry && bundle.entry.length > 0) {
					this.searchResults = bundle.entry.map(entry => entry.resource!);
					this.showSearchResults = true;
				} else if (this.searchTerm.trim()) {
					this.searchResults = [];
					this.showSearchResults = true;
				}
			},
			error: (error: any) => {
				this.isSearching = false;
				console.error('Error searching libraries:', error);
				this.toastrService.error('Failed to search libraries. Please check your connection.', 'Search Error');
			}
		});
	}

	ngOnChanges(changes: SimpleChanges) {
		console.log('Changes detected:', changes);
	}

	libraryAsString(): string {
		let s = '';
		if (this.library) {
			// Create a copy of the library object with current form values
			const libraryCopy = { ...this.library };
			libraryCopy.id = this.libraryService.libraryId || '';
			libraryCopy.name = this.libraryService.libraryId || '';
			libraryCopy.title = this.libraryService.libraryId || '';
			libraryCopy.version = this.libraryVersion || '';
			libraryCopy.description = this.libraryDescription || '';
			libraryCopy.url = this.libraryService.urlFor(this.libraryService.libraryId || '');
			
			// Update content if CQL is present
			if (this.cql && this.cql.trim()) {
				libraryCopy.content = [{
					contentType: 'text/cql',
					data: btoa(this.cql)
				}];
			} else {
				libraryCopy.content = [];
			}
			
			s = JSON.stringify(libraryCopy, null, 2);
		}
		return s;
	}

	decodeLibaryData() {
		if (this.library?.name) {
			this.libraryService.libraryId = this.library.name;
		} else {
			this.libraryService.libraryId = LibraryComponent.DEFAULT_LIBRARY_NAME;
		}
		if (this.library?.version) {
			this.libraryVersion = this.library.version;
		} else {
			this.libraryVersion = LibraryComponent.DEFAULT_LIBRARY_VERSION;
		}
		if (this.library?.description) {
			this.libraryDescription = this.library.description;
		} else {
			this.libraryDescription = `Logic Library for ${this.libraryService.libraryId}`;
		}
		if (this.library && this.library.content) {
			for (const content of this.library.content) {
				if (content.contentType === 'text/cql' && content.data) {
					try {
						this.cql = atob(content.data); // Decode base64 encoded CQL
					} catch (e) {
						console.error('Error decoding CQL:', e);
						this.toastrService.error('Failed to decode CQL content.', 'CQL Decoding Error');
					}
				}
			}
		}
	}


	reloadLibraryFromServer() {
		this.libraryService.get(this.libraryService.libraryId).subscribe({
			next: (library: Library) => {
				this.library = library;
				this.decodeLibaryData();
				console.log('Library loaded:', library);
				this.toastrService.success(`Library "${this.libraryService.libraryId}" loaded from server!`, 'Library Loaded');
			}, error: (error: any) => {
				this.library = null;
				console.error('Error loading library:', error);
				this.toastrService.error(`The server didn't respond with library for "${this.libraryService.libraryId}". It likely doesn't exist, in which case you should upload one. :)`, 'Logic Library Not Loaded');
			}
		});
	}

	// reloadExampleCql() {
	// 	this.libraryService.getExampleCql(this.exampleCqlFileUrl).subscribe({
	// 		next: (cql: string) => {
	// 			this.cql = cql;
	// 			let v = this.extractVersionFromCql(cql);
	// 			if (v) {
	// 				this.libraryVersion = v;
	// 				console.log('Extracted version from CQL:', this.libraryVersion);
	// 				this.toastrService.success(`CQL loaded to editor has not been saved to the server.`, 'Example Loaded into Editor');
	// 			} else {
	// 				this.libraryVersion = LibraryComponent.DEFAULT_LIBRARY_VERSION;
	// 				console.warn('No version found in CQL, using default version:', LibraryComponent.DEFAULT_LIBRARY_VERSION);
	// 				this.toastrService.warning(`Using default version "${LibraryComponent.DEFAULT_LIBRARY_VERSION}". CQL has not been saved to the server.`, 'Example Loaded into Editor');
	// 			}
	// 		}, error: (error: any) => {
	// 			console.error('Error loading example CQL:', error);
	// 			this.toastrService.error(`The server didn't respond with example CQL for "${this.exampleCqlFileUrl}". Please check the URL.`, 'Example CQL Not Loaded');
	// 			this.cql = null;
	// 		}
	// 	});
	// }

	extractVersionFromCql(cql: string): string | null {
		// const versionRegex = /^library.+version\s+\'(.*)\'$/
		const versionRegex = /library.*version\s+['"]([^'"]+)['"]/; // Match version in single or double quotes
		const match = cql.match(versionRegex);
		let version = null;
		if (match?.length && match.length >= 2) {
			version = match[1];
		}
		return version;
	}

	saveCql() {
		if (this.cql) {
			let bundle = this.buildFHIRBundle(
				this.libraryService.libraryId,
				this.libraryVersion,
				this.libraryDescription,
				this.cql);
			this.libraryService.put(bundle).subscribe({
				next: (response: any) => {
					console.log('Library saved successfully:', response);
					this.toastrService.success(`Library "${this.libraryService.libraryId}" saved successfully!`, 'Library Saved to Server');
					this.library = response; // Update the local library reference
					this.isNewLibrary = false; // After saving, it's no longer a new library
					// this.reloadLibrary();
				}, error: (error: any) => {
					console.error('Error saving library:', error);
					this.toastrService.error(`Failed to save library "${this.libraryService.libraryId}". Please check the server logs for more details.`, 'Library Save Failed');
				}
			});
		}
	}

	deleteCql() {
		if (this.library) {
			this.libraryService.delete(this.library).subscribe({
				next: (response: any) => {
					console.log('Library deleted successfully:', response);
					this.toastrService.success(`Library "${this.libraryService.libraryId}" deleted successfully!`, 'Library Deleted');
					this.library = null; // Clear the local library reference
					this.hasSelectedLibrary = false; // Reset selection state
					this.isNewLibrary = false; // Reset new library state
					this.decodeLibaryData(); // Reset the decoded data to defaults
				}, error: (error: any) => {
					console.error('Error deleting library:', error);
					this.toastrService.error(`Failed to delete library "${this.libraryService.libraryId}". Please check the server logs for more details.`, 'Library Delete Failed');
				}
			});
		} else {
			this.toastrService.error('No library ID set. Please provide a valid library ID before deleting.', 'Library Delete Error');
		}
	}

	buildFHIRBundle(libraryName: string, version: string, description: string, cql: string) {
		let encoded = btoa(cql); // Ensure cql is base64 encoded
		const libraryResource: Library = {
			resourceType: 'Library',
			type: {},
			id: libraryName,
			version: version,
			name: libraryName,
			title: libraryName,
			status: 'active',
			description: description,
			url: this.libraryService.urlFor(libraryName),
			content: [
				{
					contentType: 'text/cql',
					data: encoded, // Use base64 encoded CQL
				},
			],
		};
		return libraryResource;
	}

	// Search functionality methods
	onSearchInput(event: any) {
		const searchTerm = event.target.value;
		this.searchTerm = searchTerm;
		this.searchSubject.next(searchTerm);
	}

	selectLibrary(library: Library) {
		if (library.id) {
			this.libraryService.libraryId = library.id;
			this.showSearchResults = false;
			this.searchTerm = "";
			this.searchResults = [];
			
			// Set state for existing library
			this.isNewLibrary = false;
			this.hasSelectedLibrary = true;
			
			// Set the library object immediately for the FHIR Resource tab
			this.library = library;
			
			this.reloadLibraryFromServer();
			this.toastrService.success(`Selected library: ${library.name || library.id}`, 'Library Selected');
		}
	}

	clearSearch() {
		this.searchTerm = "";
		this.searchResults = [];
		this.showSearchResults = false;
		this.isSearching = false;
		this.searchSubject.next(""); // Clear any pending searches
	}

	createNewLibrary() {
		// Reset to defaults for a new library
		this.libraryService.libraryId = "";
		this.libraryVersion = LibraryComponent.DEFAULT_LIBRARY_VERSION;
		this.libraryDescription = "";
		this.cql = "";
		
		// Create a basic Library object for the FHIR Resource tab
		this.library = {
			resourceType: 'Library',
			type: {},
			id: '',
			version: this.libraryVersion,
			name: '',
			title: '',
			status: 'draft',
			description: this.libraryDescription,
			url: '',
			content: []
		};
		
		// Set state for new library
		this.isNewLibrary = true;
		this.hasSelectedLibrary = true;
		
		// Clear search state
		this.clearSearch();
		
		this.toastrService.info("Creating new library. Fill in the details below.", "New Library");
	}

	clearSelection() {
		// Reset all state
		this.library = null;
		this.libraryService.libraryId = "";
		this.libraryVersion = LibraryComponent.DEFAULT_LIBRARY_VERSION;
		this.libraryDescription = "";
		this.cql = "";
		this.isNewLibrary = false;
		this.hasSelectedLibrary = false;
		
		// Clear search state
		this.clearSearch();
		
		this.toastrService.info("Cleared selection. You can now search for existing libraries or create a new one.", "Selection Cleared");
	}

}