import * as cdk from 'aws-cdk-lib';
import { SecretValue, Stage } from 'aws-cdk-lib';
import { BuildEnvironmentVariableType, BuildSpec, LinuxBuildImage, PipelineProject, Project } from 'aws-cdk-lib/aws-codebuild';
import { Artifact, IStage, Pipeline } from 'aws-cdk-lib/aws-codepipeline';
import { CloudFormationCreateUpdateStackAction, CodeBuildAction, CodeBuildActionType, GitHubSourceAction } from 'aws-cdk-lib/aws-codepipeline-actions';
import { EmailSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { Construct } from 'constructs';
import * as sns from '@aws-cdk/aws-sns';
import { Topic } from "aws-cdk-lib/aws-sns";
import { SnsTopic } from 'aws-cdk-lib/aws-events-targets';
import { EventField, RuleTargetInput } from 'aws-cdk-lib/aws-events';



export class NewpipelineStack extends cdk.Stack {

  private readonly pipeline: Pipeline;
  private readonly cdkBuildOutput: Artifact;
  private readonly serviceBuildOutput: Artifact;
  private readonly serviceSourceOutput: Artifact;
  private readonly cdkSourceOutput: Artifact;
  private readonly pipelineNotificationsTopic: Topic;
  private readonly buildFailureTopic:Topic;

  /////
  
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    
    super(scope, id, props);
    
    this.pipelineNotificationsTopic = new Topic(
      this,
      "PipelineNotificationsTopic",
      {
        topicName: "PipelineNotifications",
      }
    );
    this.pipelineNotificationsTopic.addSubscription(
      new EmailSubscription("syeds7933.ss@gmail.com")
    );
        
        this.pipeline = new Pipeline(this, 'Pipeline', {
          pipelineName: "Pipeline",
      crossAccountKeys: false,
      restartExecutionOnUpdate: true,

    })

    this.cdkSourceOutput = new Artifact("CDKSourceOutput");
    this.serviceSourceOutput = new Artifact("serviceSourceOutput")

    this.pipeline.addStage({
      stageName:"Source",
      actions:
      [
       new GitHubSourceAction({
        owner: "syedshoaib02",
        repo: "aws_test",
        branch: "master",
        actionName: "Pipeline_Source",
        oauthToken: SecretValue.secretsManager("git_aws"),
        output:this.cdkSourceOutput
        

       }),
      ],
    })
    this.cdkBuildOutput = new Artifact("CdkBuildOutput");
    this.serviceBuildOutput = new Artifact("ServiceBuildOutput");

    const buildStage= this.pipeline.addStage({
      stageName:"build",
      actions: [
        new CodeBuildAction({
          
          actionName: "CDK_Build",
          input: this.cdkSourceOutput,
          outputs: [this.cdkBuildOutput],
          project: new PipelineProject(this, "CdkBuildProject", {
            environment: {
              buildImage: LinuxBuildImage.STANDARD_5_0,
            },
            buildSpec: BuildSpec.fromSourceFilename(
              "build-specs/cdk-build-spec.yml"
              ),
            }),
            runOrder: 1,
          
      }),
    ]
  })

    buildStage.onStateChange(
      "FAILED",
      new SnsTopic(this.pipelineNotificationsTopic, {
        message: RuleTargetInput.fromText(
          `Build Test Failed By Syed. See details here: ${EventField.fromPath(
            "$.detail.execution-result.external-execution-url"
          )}`
        ),
      }),
      {
        ruleName: "Failed",
        eventPattern: {
          detail: {
            state: ["FAILED"],
          },
        },
        description: "Integration test has failed by syed",
      }
    );

    this.pipeline.addStage({
      stageName: "Pipeline_Update",
      actions: [
        new CloudFormationCreateUpdateStackAction({
          actionName: "Pipeline_Update",
          stackName: "NewpipelineStack",
          templatePath: this.cdkBuildOutput.atPath("NewpipelineStack.template.json"),
          adminPermissions: true,

        }),
      ],
    });
  }
}


//////
//    public addServiceStage(
//     serviceStack: PipelineProject,
//     stageName: string
//   ): IStage {
//     return this.pipeline.addStage({
//       stageName: stageName,
     
//     });
//     actions: [
//       new CodeBuildAction({

//         actionName: "CDK_Build",
//         input: this.cdkSourceOutput,
//         outputs: [this.cdkBuildOutput],
//         project: new PipelineProject(this, "CdkBuildProject", {
//           environment: {
//               buildImage: LinuxBuildImage.STANDARD_5_0,
//             },
//           buildSpec: BuildSpec.fromSourceFilename(
//             "build-specs/cdk-newman-build-spec.yml"
//             ),       
//           }),
          
  
//         }),  
//     ]
//   }

// public addNotification(stage:IStage)
// {
//   stage.addAction(
//     new CloudFormationCreateUpdateStackAction({
//       actionName: "Cdk_Build",
//       stackName: "pipeline",
//       templatePath: this.cdkBuildOutput.atPath(
//         `NewpipelineStack.template.json`
//       ),
//       adminPermissions: true,
//     })
//   );

// }
  
//     public addServiceTestToStage(
//       stage: IStage,
    
//     ) {
//       const buildStag =  new CodeBuildAction({
//         actionName: "CDK_Build",
//         input: this.cdkSourceOutput,
//         outputs: [this.cdkBuildOutput],
//         project: new PipelineProject(this, "CdkBuildProject", {
//             environment: {
//             buildImage: LinuxBuildImage.STANDARD_5_0,
//             },
//             buildSpec: BuildSpec.fromSourceFilename(
//             "build-specs/cdk-newman-build-spec.yml"
//             ),     

//         }),
//         type: CodeBuildActionType.TEST,
//         runOrder: 2,
//       });
  
//       stage.addAction(buildStag);
//       buildStag.onStateChange(
//         "IntegrationTestFailed",
//         new SnsTopic(this.pipelineNotificationsTopic, {
//           message: RuleTargetInput.fromText(
//             `Building Test Failed By SureshJi. See details here: ${EventField.fromPath(
//               "$.detail.execution-result.external-execution-url"
//             )}`
//           ),
//         }),
//         {
//           ruleName: "IntegrationTestFailed",
//           eventPattern: {
//             detail: {
//               state: ["FAILED"],
//             },
//           },
//           description: "Integration test has failed",
//         }
//       );
//     }  
//   }


