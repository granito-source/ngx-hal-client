import { NgModule } from '@angular/core';
import { ResourceService, ResourceServiceImpl } from './resource.service';

@NgModule({
    providers: [
        {
            provide: ResourceService,
            useClass: ResourceServiceImpl
        }
    ]
})
export class HalClientModule {
}
