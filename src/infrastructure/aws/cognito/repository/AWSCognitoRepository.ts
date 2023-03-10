import { DITokens } from "@/src/core/di/di-token";
import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserPool,
} from "amazon-cognito-identity-js";
import { CognitoIdentityCredentials } from "aws-sdk";
import { inject, injectable } from "inversify";
import { AWSCredentialsRepository } from "../../credentials/repository/AWSCredentialsRepository";
import {
  IAWSCognitoAuthenticationParams,
  IAWSCognitoRepository,
} from "../interface/IAWSCognitoRepository";

@injectable()
export class AWSCognitoRepository implements IAWSCognitoRepository {
  private cognitoUserPool: CognitoUserPool;
  constructor(
    @inject(DITokens.AWSCredentialsRepository)
    private readonly _awsCredentialsRepository: AWSCredentialsRepository
  ) {
    this.cognitoUserPool = new CognitoUserPool({
      UserPoolId: process.env.COGNITO_USER_POOL_ID || "",
      ClientId: process.env.COGNITO_CLIENT_ID || "",
    });
  }
  authenticate({
    username,
    password,
    callback,
  }: IAWSCognitoAuthenticationParams): void {
    const authenticationDetails = new AuthenticationDetails({
      Username: username,
      Password: password,
    });

    const cognitoUser = new CognitoUser({
      Pool: this.cognitoUserPool,
      Username: authenticationDetails.getUsername(),
    });

    cognitoUser.authenticateUser(authenticationDetails, {
      onSuccess: (result) => {
        const identityPoolId = process.env.COGNITO_IDENTITY_POOL_ID || "";
        const cognitoUrl = process.env.COGNITO_URL || "";
        const region = process.env.AWS_REGION || "";
        const cognitoCredentials = new CognitoIdentityCredentials(
          {
            IdentityPoolId: identityPoolId,
            Logins: {
              [cognitoUrl]: result.getIdToken().getJwtToken(),
            },
          },
          { region }
        );
        this._awsCredentialsRepository.saveCognitoCredentials(
          cognitoCredentials
        );

        callback(null, result.getIdToken().payload.sub);
      },
      onFailure: function (err) {
        callback(err, null);
        console.error(err);
      },
    });
  }
}
