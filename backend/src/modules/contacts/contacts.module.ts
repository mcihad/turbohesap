import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { Contact } from './entities/contact.entity'
import { ContactGroup } from './entities/contact-group.entity'
import { ContactPerson } from './entities/contact-person.entity'
import { ContactAddress } from './entities/contact-address.entity'
import { ContactTransaction } from './entities/contact-transaction.entity'
import { Activity } from './entities/activity.entity'
import { Opportunity } from './entities/opportunity.entity'
import { Pipeline } from './entities/pipeline.entity'
import { PipelineStage } from './entities/pipeline-stage.entity'
import { Notification } from './entities/notification.entity'
import { CrmFieldDefEntity } from './entities/crm-field-def.entity'
import { IntegrationConnection } from './entities/integration-connection.entity'
import { User } from '../iam/entities/user.entity'

import { ContactsService } from './contacts.service'
import { PipelinesService } from './pipelines.service'
import { PipelinesController } from './pipelines.controller'
import { CrmAnalyticsService } from './crm-analytics.service'
import { CrmController } from './crm.controller'
import { NotificationsService } from './notifications.service'
import { NotificationsController } from './notifications.controller'
import { CrmFieldsService } from './crm-fields.service'
import { CrmFieldsController } from './crm-fields.controller'
import { IntegrationsService } from './integrations.service'
import { IntegrationsController } from './integrations.controller'
import { ContactsController } from './contacts.controller'
import { ContactGroupsService } from './contact-groups.service'
import { ContactGroupsController } from './contact-groups.controller'
import { ContactPersonsService } from './contact-persons.service'
import { ContactPersonsController } from './contact-persons.controller'
import { ContactAddressesService } from './contact-addresses.service'
import { ContactAddressesController } from './contact-addresses.controller'
import { ContactTransactionsService } from './contact-transactions.service'
import { ContactTransactionsController } from './contact-transactions.controller'
import { ActivitiesService } from './activities.service'
import { ActivitiesController } from './activities.controller'
import { OpportunitiesService } from './opportunities.service'
import { OpportunitiesController } from './opportunities.controller'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Contact,
      ContactGroup,
      ContactPerson,
      ContactAddress,
      ContactTransaction,
      Activity,
      Opportunity,
      Pipeline,
      PipelineStage,
      Notification,
      CrmFieldDefEntity,
      IntegrationConnection,
      User,
    ]),
  ],
  controllers: [
    ContactsController,
    PipelinesController,
    CrmController,
    NotificationsController,
    CrmFieldsController,
    IntegrationsController,
    ContactGroupsController,
    ContactPersonsController,
    ContactAddressesController,
    ContactTransactionsController,
    ActivitiesController,
    OpportunitiesController,
  ],
  providers: [
    ContactsService,
    PipelinesService,
    CrmAnalyticsService,
    NotificationsService,
    CrmFieldsService,
    IntegrationsService,
    ContactGroupsService,
    ContactPersonsService,
    ContactAddressesService,
    ContactTransactionsService,
    ActivitiesService,
    OpportunitiesService,
  ],
})
export class ContactsModule {}
