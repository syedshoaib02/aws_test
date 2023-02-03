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
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as ses from 'aws-cdk-lib/aws-ses';



export class NewpipelineStack extends cdk.Stack {

  private readonly pipeline: Pipeline;
  private readonly cdkBuildOutput: Artifact;
  private readonly serviceBuildOutput: Artifact;
  private readonly serviceSourceOutput: Artifact;
  private readonly cdkSourceOutput: Artifact;
  private readonly pipelineNotificationsTopic: Topic;
  private readonly buildFailureTopic:Topic;

  
  
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    
    super(scope, id, props);


    
    // const email = new ses.EmailAddress('test@example.com');

    // const topic = new sns.Topic(this, 'PipelineBuildFailNotification');
    // topic.addSubscription(new subscriptions.EmailSubscription(email));
    
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

    //



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
              "build-specs/cdk-newman-build-spec.yml"
              ),
            }),
            runOrder: 1,
          
      }),
    ]
  })


  // const fn = new lambda.Function(this, 'BuildFailHandler', {
  //   runtime: lambda.Runtime.NODEJS_14_X,
  //   code: lambda.Code.fromInline(`
  //     exports.handler = async function(event) {
  //       const { detail } = event;
  //       const { stage, state } = detail;

  //       if (stage === 'build' && state === 'FAILED') {
  //         const message = \`The build stage failed for pipeline \${pipeline.pipelineName}.\`;
  //         await topic.publish({ Message: message });
  //       }
  //     };
  //   `),
  //   handler: 'index.handler',
  // });



















  



  

 
    buildStage.onStateChange(
      "FAILED",
      new SnsTopic(this.pipelineNotificationsTopic, {
        message: RuleTargetInput.fromText(
          `Integration Test Failed by syed. See details here: ${EventField.fromPath(
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
   public addServiceStage(
    serviceStack: PipelineProject,
    stageName: string
  ): IStage {
    return this.pipeline.addStage({
      stageName: stageName,
     
    });
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
            "build-specs/cdk-newman-build-spec.yml"
            ),       
          }),
          
  
        }),  
    ]
  }



 
   
  













public addNotification(stage:IStage)
{
  stage.addAction(
    new CloudFormationCreateUpdateStackAction({
      actionName: "Cdk_Build",
      stackName: "pipeline",
      templatePath: this.cdkBuildOutput.atPath(
        `NewpipelineStack.template.json`
      ),
      adminPermissions: true,
    })
  );

}












  
    public addServiceTestToStage(
      stage: IStage,
    
    ) {
      const buildStag =  new CodeBuildAction({
        actionName: "CDK_Build",
        input: this.cdkSourceOutput,
        outputs: [this.cdkBuildOutput],
        project: new PipelineProject(this, "CdkBuildProject", {
            environment: {
            buildImage: LinuxBuildImage.STANDARD_5_0,
            },
            buildSpec: BuildSpec.fromSourceFilename(
            "build-specs/cdk-newman-build-spec.yml"
            ),     

        }),
        type: CodeBuildActionType.TEST,
        runOrder: 2,
      });
  
      stage.addAction(buildStag);
      buildStag.onStateChange(
        "IntegrationTestFailed",
        new SnsTopic(this.pipelineNotificationsTopic, {
          message: RuleTargetInput.fromText(
            `Integration Test Failed by sureshJi. See details here: ${EventField.fromPath(
              "$.detail.execution-result.external-execution-url"
            )}`
          ),
        }),
        {
          ruleName: "IntegrationTestFailed",
          eventPattern: {
            detail: {
              state: ["FAILED"],
            },
          },
          description: "Integration test has failed",
        }
      );
    }
  
    
    

  
  }



    
   
  

  





// import * as cdk from 'aws-cdk-lib';
// import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
// import * as ses from 'aws-cdk-lib/aws-ses';
// import * as sns from 'aws-cdk-lib/aws-sns';
// import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
// import * as lambda from 'aws-cdk-lib/aws-lambda';
// import * as iam from 'aws-cdk-lib/aws-iam';
// import * as actions from 'aws-cdk-lib/aws-codepipeline-actions';
// import { Artifact, IStage, Pipeline } from 'aws-cdk-lib/aws-codepipeline';
// import { CloudFormationCreateUpdateStackAction, CodeBuildAction, GitHubSourceAction } from 'aws-cdk-lib/aws-codepipeline-actions';
// import { CfnRule, SecretValue } from 'aws-cdk-lib';
// import { BuildSpec, LinuxBuildImage, PipelineProject } from 'aws-cdk-lib/aws-codebuild';
// import * as events from '@aws-cdk/aws-events';

// export class NewpipelineStack extends cdk.Stack {

//   private readonly pipeline: Pipeline;
//   private readonly cdkBuildOutput: Artifact;
//   private readonly serviceBuildOutput: Artifact;
//  private readonly serviceSourceOutput: Artifact;
//  eventPattern: any;
//  private readonly cdkSourceOutput: Artifact;
//  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
//    super(scope, id, props);
//    const email = 'syeds7933.ss@gmail.com';

//     const topic = new sns.Topic(this, 'PipelineBuildFailNotification');
//     topic.addSubscription(new subscriptions.EmailSubscription(email));

//     this.pipeline = new Pipeline(this, 'Pipeline', {
//       pipelineName: "Pipeline",
//       crossAccountKeys: false,
//       restartExecutionOnUpdate: true,

//     })

//     const cdkSourceOutput = new Artifact("CDKSourceOutput");
//     this.serviceSourceOutput = new Artifact("serviceSourceOutput")
    

//     const pipeline = new codepipeline.Pipeline(this, 'Pipeline', {
//       stages: [
//         {
//           stageName: 'Source',
//           actions: [
//             new GitHubSourceAction({
//               owner: "syedshoaib02",
//               repo: "aws_test",
//               branch: "master",
//               actionName: "Pipeline_Source",
//               oauthToken: SecretValue.secretsManager("git_aws"),
//               output:cdkSourceOutput
//             }),
//           ],
//         },

        
//         {
//           stageName: 'Build',
//           actions: [
//             new actions.CodeBuildAction({
//               actionName: 'Build',
//               input: cdkSourceOutput,
//               project: new PipelineProject(this, 'BuildProject', {
//                 buildSpec: BuildSpec.fromSourceFilename(
//                   "build-specs/cdk-build-spec.yml"
//                 ),
//               }),
//             }),
//           ],
//         },
//       ],
//     });

  //   this.pipeline.addStage({
  //     stageName:"Source",
  //     actions:
  //     [
  //      new GitHubSourceAction({
  //       owner: "syedshoaib02",
  //       repo: "aws_test",
  //       branch: "master",
  //       actionName: "Pipeline_Source",
  //       oauthToken: SecretValue.secretsManager("git_aws"),
  //       output:cdkSourceOutput
        

  //      }),       
  //     ],
  //   })

  //   this.cdkBuildOutput = new Artifact("CdkBuildOutput");
  //   this.serviceBuildOutput = new Artifact("ServiceBuildOutput");


 
  //   this.pipeline.addStage({
  //     stageName:"build",
  //     actions: [
  //       new CodeBuildAction({
          
  //         actionName: "CDK_Build",
  //         input: this.cdkSourceOutput,
  //         outputs: [this.cdkBuildOutput],
  //         project: new PipelineProject(this, "CdkBuildProject", {
  //           environment: {
  //             buildImage: LinuxBuildImage.STANDARD_5_0,
  //           },
  //           buildSpec: BuildSpec.fromSourceFilename(
  //             "build-specs/cdk-newman-build-spec.yml"
  //             ),
  //           }),
  
          
  //     }),
  //   ]
  // })


  // this.pipeline.addStage({
  //         stageName: "Pipeline_Update",
  //         actions: [
  //           new CloudFormationCreateUpdateStackAction({
  //             actionName: "Pipeline_Update",
  //             stackName: "NewpipelineStack",
  //             templatePath: this.cdkBuildOutput.atPath("NewpipelineStack.template.json"),
  //             adminPermissions: true,
    
  //           }),
  //         ],
  //       });
      










//     const fn = new lambda.Function(this, 'BuildFailHandler', {
//       runtime: lambda.Runtime.NODEJS_12_X,
//       code: lambda.Code.fromInline(`
//         exports.handler = async function(event) {
//           const { detail } = event;
//           const { stage, state } = detail;

//           if (stage === 'Build' && state === 'FAILED') {
//             const message = \`The build stage failed for pipeline \${pipeline.pipelineName}.\`;
//             await topic.publish({ Message: message });
//           }
//         };
//       `),
//       handler: 'index.handler',
//     });
//     fn.addToRolePolicy(new iam.PolicyStatement({
//       actions: [
//         'logs:CreateLogGroup',
//         'logs:CreateLogStream',
//         'logs:PutLogEvents',
//       ],               
// resources: [
// topic.topicArn,
// pipeline.pipelineArn,
// ],
// }));

// pipeline.addToRolePolicy(new iam.PolicyStatement({
//   actions: [
//     'cloudwatch:DescribeAlarms',
//     'cloudwatch:GetMetricData',
//     'cloudwatch:GetMetricStatistics',
//     'cloudwatch:ListMetrics',
//   ],
//   resources: ['*'],
// }));

// new events.CfnRule(this, 'BuildFailEventRule', {
//   description: 'Notify SNS topic on build fail event',
//   eventPattern: {
//     detail: {
//       stage: [
//         'Build',
//       ],
//       state: [
//         'FAILED',
//       ],
//     },
//     source: [
//       'aws.codepipeline',
//     ],
//   },
//   targets: [
//     {
//       arn: fn.functionArn,
//       id: 'BuildFailHandler',
//     },
//   ],
// });
// }
// }




