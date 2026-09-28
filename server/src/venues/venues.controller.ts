import { Controller, Get, Param, Query } from '@nestjs/common';
import { VenuesService } from './venues.service';
import { QueryVenueDto } from './dto/query-venue.dto';
import { Public } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('venues')
export class VenuesController {
  constructor(private readonly venuesService: VenuesService) {}

  @Public()
  @Get()
  async findAll(@Query() query: QueryVenueDto) {
    return this.venuesService.findAll(query);
  }

  @Public()
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.venuesService.findOne(id);
  }

  @Public()
  @Get(':id/availability')
  async getAvailability(
    @Param('id') id: string,
    @Query('date') date?: string,
    @CurrentUser() user?: any,
  ) {
    const isAdmin = user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN');
    return this.venuesService.getAvailability(id, date, isAdmin);
  }

  @Public()
  @Get(':id/slots/:slotId/courts')
  async getSlotCourts(@Param('id') id: string, @Param('slotId') slotId: string) {
    return this.venuesService.getSlotCourts(id, slotId);
  }
}
