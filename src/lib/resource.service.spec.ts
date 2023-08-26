import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { ResourceService } from './resource.service';

describe('ResourceService', () => {
    const createService = createServiceFactory({
        service: ResourceService
    });
    let spectator: SpectatorService<ResourceService>;

    beforeEach(() => spectator = createService());

    it('gets created', () => {
        expect(spectator.service).toBeTruthy();
    });
});
