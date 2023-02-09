import * as cdk from 'aws-cdk-lib';
import { SecretValue, Stage } from 'aws-cdk-lib';
import { BuildEnvironmentVariableType, BuildSpec, LinuxBuildImage, PipelineProject, Project } from 'aws-cdk-lib/aws-codebuild';
import { Artifact, IStage, Pipeline } from 'aws-cdk-lib/aws-codepipeline';
import { CloudFormationCreateUpdateStackAction, CodeBuildAction, CodeBuildActionType, GitHubSourceAction } from 'aws-cdk-lib/aws-codepipeline-actions';
import { EmailSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { Construct } from 'constructs';
import { Topic } from "aws-cdk-lib/aws-sns";
import { SnsTopic } from 'aws-cdk-lib/aws-events-targets';
import { EventField, RuleTargetInput } from 'aws-cdk-lib/aws-events';
import { Stack, App, aws_s3 as s3 } from 'aws-cdk-lib';
import { exec } from 'node:child_process';

import { execSync } from 'child_process';


export class NewpipelineStack extends cdk.Stack {
  
  private readonly pipeline: Pipeline;
  private readonly cdkBuildOutput: Artifact;
  private readonly serviceBuildOutput: Artifact;
  private readonly serviceSourceOutput: Artifact;
  private readonly cdkSourceOutput: Artifact;
  private readonly pipelineNotificationsTopic: Topic;
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
              "build-specs/cdk-newman-build-spec.yml"
              ),
            }),
            runOrder: 1,
          
      }),
    ]
  })


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

    
      let commitId = execSync('git rev-parse HEAD', {encoding: 'utf8'}).toString().trim();
      //  console.log('Commit ID:', commitId.substring(0, 7));

     const latest =commitId.substring(0, 7)
     console.log(latest)
    //  process.env.IMAGE_TAG
    //  console.log(process.env.IMAGE_TAG)
    
    
    const bucketName = 'newpipelinestack-pipelineartifactsbucket22248f97-dttshkqq1xz2';
const reportKey = 'newpipelinestack-pipelineartifactsbucket22248f97-dttshkqq1xz2/reports';
const htmlReportKey = `newpipelinestack-pipelineartifactsbucket22248f97-dttshkqq1xz2.s3.ap-south-1.amazonaws.com/reports/PPL_Report-${latest}.html`;


buildStage.onStateChange(
  "FAILED",
  new SnsTopic(this.pipelineNotificationsTopic, {
    message: RuleTargetInput.fromText(
      `Build Test Failed By Syed. Check the report in S3 bucket: ${bucketName}. Report file (text): ${reportKey}.
      To Download the Report file (HTML): https://${htmlReportKey}`
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



buildStage.onStateChange(
  "SUCCEEDED", 
new SnsTopic(this.pipelineNotificationsTopic, {
  message: RuleTargetInput.fromText(
    `Build Test Passed By Syed.Check the report in S3 bucket: ${bucketName}. Report file (text): ${reportKey}.
    To Download the Report file (HTML): https://${htmlReportKey}`
  ),
}),
{
  ruleName: "Success",
  eventPattern: {
    detail: {
      state: ["SUCCEEDED"],
    },
  },
  description: "Integration test has Passed by syed",
}
);


  }
  
}



///////