import { NgModule } from '@angular/core';
import { HalClientService, ResourceServiceImpl } from './hal-client.service';

@NgModule({
    providers: [
        {
            provide: HalClientService,
            useClass: ResourceServiceImpl
        }
    ]
})
export class HalClientModule {
}
