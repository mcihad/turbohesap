import { Module } from '@nestjs/common'

import { AuthController } from './auth.controller'
import { KeycloakService } from './keycloak.service'
import { StateStore } from './state.store'
import { TokenVerifier } from './token-verifier.service'

// AuthModule wires the Keycloak flow (KeycloakService + StateStore) and the
// access-token verifier (TokenVerifier). TokenVerifier is exported so guards in
// other modules can require a valid token.
@Module({
  controllers: [AuthController],
  providers: [KeycloakService, StateStore, TokenVerifier],
  exports: [TokenVerifier],
})
export class AuthModule {}
