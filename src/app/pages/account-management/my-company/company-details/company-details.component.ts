import {Component, Input, OnDestroy, OnInit} from '@angular/core';
import {
  AuthHolderService,
  DeveloperDataModel,
  DeveloperModel,
  DeveloperService,
  DeveloperTypeFieldModel,
  DeveloperTypeService
} from 'oc-ng-common-service';
import {Subscription} from 'rxjs';
import {ActivatedRoute} from '@angular/router';
import {ToastrService} from 'ngx-toastr';
import { LoadingBarState } from '@ngx-loading-bar/core/loading-bar.state';
import { LoadingBarService } from '@ngx-loading-bar/core';

@Component({
  selector: 'app-company',
  templateUrl: './company-details.component.html',
  styleUrls: ['./company-details.component.scss']
})
export class CompanyDetailsComponent implements OnInit, OnDestroy {

  @Input()
  developerData: DeveloperDataModel;

  typeFields: {
    fields: DeveloperTypeFieldModel [];
  };

  isInvalidForm = true;
  savingCompanyData = false;
  showSaveButton = false;

  private newCustomData: any;
  private defaultDeveloperTypeFields: DeveloperTypeFieldModel [] = [{
    id: 'name',
    label: 'Company Name',
    type: 'text',
    attributes: {
      required: true
    }
  }];
  private subscriptions: Subscription = new Subscription();
  private loader: LoadingBarState;

  constructor(private developerService: DeveloperService,
              private developerTypeService: DeveloperTypeService,
              private authHolderService: AuthHolderService,
              private activatedRoute: ActivatedRoute,
              private toastService: ToastrService,
              public loadingBar: LoadingBarService) {
  }

  ngOnInit(): void {
    this.loader = this.loadingBar.useRef();
    this.loader.start();
    this.subscriptions.add(this.developerTypeService.getDeveloperType(this.developerData.developer?.type)
    .subscribe(developerType => {
      this.createFormFields(developerType.fields);
    }, error => {
      if (error.status === 404) {
        this.createFormFields(this.defaultDeveloperTypeFields);
      }
      this.loader.complete();
    }));
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  saveType(): void {
    if (this.showSaveButton && !this.savingCompanyData && !this.isInvalidForm) {
      this.savingCompanyData = true;
      const request = {
        name: this.getDeveloperName(this.developerData.developer, this.newCustomData),
        customData: {
          ...(this.developerData.developer?.customData ? this.developerData.developer.customData : {}),
          ...(this.getCustomDataValues(this.newCustomData))
        }
      };
      this.subscriptions.add(this.developerService.updateDeveloper(request)
      .subscribe(developerResponse => {
        this.developerData.developer = developerResponse;
        this.savingCompanyData = false;
        this.toastService.success('Your organization details has been updated');
      }, error => {
        this.savingCompanyData = false;
      }));
    }
  }

  private createFormFields(fields: DeveloperTypeFieldModel[]): void {
    this.typeFields = {
      fields: this.mapTypeFields(this.developerData.developer, fields)
    };
    this.updateSaveButton();
    this.loader.complete();
  }

  setCompanyData(newCustomData: any): void {
    this.newCustomData = newCustomData;
  }

  setIsFormInvalid(isInvalidForm: boolean): void {
    this.isInvalidForm = isInvalidForm;
  }

  private getDeveloperName(developer: DeveloperModel, newCustomData: any): string {
    const newName = newCustomData.name;
    if (newName && newName !== developer.name) {
      return newName;
    }
    return developer.name;
  }

  updateSaveButton(): void {
    const type = this.authHolderService.userDetails.role;
    this.showSaveButton = type === 'ADMIN' || !type;
  }

  private getCustomDataValues(customData: any): any {
    const result = {};
    Object.entries(customData ? customData : {}).forEach(([key, value]) => {
      if (key.includes('customData.')) {
        result[key.replace('customData.', '')] = value;
      }
    });
    return result;
  }

  private mapTypeFields(developer: DeveloperModel, fields: DeveloperTypeFieldModel[]): DeveloperTypeFieldModel [] {
    if (fields) {
      const defaultValues = this.getDefaultValues(developer);
      return fields.filter(field => field?.id).map(field => this.mapField(field, defaultValues));
    }
    return [];
  }

  private mapField(field: DeveloperTypeFieldModel, defaultValues: Map<string, any>): DeveloperTypeFieldModel {
    if (field) {
      // map options
      if (field?.options) {
        field.options = this.mapOptions(field);
      }
      if (defaultValues.has(field?.id)) {
        field.defaultValue = defaultValues.get(field?.id);
      }
      // map other fields
      if (field?.fields) {
        field.fields.forEach(child => this.mapField(child, defaultValues));
        field.subFieldDefinitions = field.fields;
        field.fields = null;
      }
    }
    return field;
  }

  private getDefaultValues(developer: DeveloperModel): Map<string, any> {
    const map = new Map<string, any>();
    Object.entries(developer?.customData ? developer.customData : {})
    .forEach(([key, value]) => map.set(`customData.${key}`, value));
    map.set('name', developer.name);
    return map;
  }

  private mapOptions(appTypeFiled: DeveloperTypeFieldModel): string [] {
    const newOptions = [];
    appTypeFiled.options.forEach(o => newOptions.push(o?.value ? o.value : o));
    return newOptions;
  }
}
