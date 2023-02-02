import * as cdk from "aws-cdk-lib";
import * as codepipeline from "aws-cdk-lib/aws-codepipeline";
import * as ses from "aws-cdk-lib/aws-ses";
import * as sns from "aws-cdk-lib/aws-sns";
import * as subscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import * as actions from "aws-cdk-lib/aws-codepipeline-actions";
import { Artifact, IStage, Pipeline } from "aws-cdk-lib/aws-codepipeline";
import { aws_events as events } from 'aws-cdk-lib';

import {
  CloudFormationCreateUpdateStackAction,
  CodeBuildAction,
  GitHubSourceAction,
} from "aws-cdk-lib/aws-codepipeline-actions";
import { CfnRule, SecretValue } from "aws-cdk-lib";
import {
  BuildSpec,
  LinuxBuildImage,
  PipelineProject,
} from "aws-cdk-lib/aws-codebuild";
// import * as events from "@aws-cdk/aws-events";

export class NewpipelineStack extends cdk.Stack {

  eventPattern: any;
  private readonly cdkSourceOutput: Artifact;
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const email = "syeds7933.ss@gmail.com";

    const topic = new sns.Topic(this, "PipelineBuildFailNotification");
    topic.addSubscription(new subscriptions.EmailSubscription(email));


    const cdkSourceOutput = new Artifact("CDKSourceOutput");
  

    const pipeline = new codepipeline.Pipeline(this, "Pipeline", {
      stages: [
        {
          stageName: "Source",
          actions: [
            new GitHubSourceAction({
              owner: "syedshoaib02",
              repo: "aws_test",
              branch: "master",
              actionName: "Pipeline_Source",
              oauthToken: SecretValue.secretsManager("git_aws"),
              output: cdkSourceOutput,
            }),
          ],
        },

        {
          stageName: "Build",
          actions: [
            new actions.CodeBuildAction({
              actionName: "Build",
              input: cdkSourceOutput,
              project: new PipelineProject(this, "BuildProject", {
                buildSpec: BuildSpec.fromSourceFilename(
                  "build-specs/cdk-build-spec.yml"
                ),
              }),
            }),
          ],
        },
      ],
    });

    const fn = new lambda.Function(this, "BuildFailHandler", {
      runtime: lambda.Runtime.NODEJS_12_X,
      code: lambda.Code.fromInline(`
        exports.handler = async function(event) {
          const { detail } = event;
          const { stage, state } = detail;

          if (stage === 'Build' && state === 'FAILED') {
            const message = \`The build stage failed for pipeline \${pipeline.pipelineName}.\`;
            await topic.publish({ Message: message });
          }
        };
      `),
      handler: "index.handler",
    });
    fn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ],
        resources: [topic.topicArn, pipeline.pipelineArn],
      })
    );

    pipeline.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "cloudwatch:DescribeAlarms",
          "cloudwatch:GetMetricData",
          "cloudwatch:GetMetricStatistics",
          "cloudwatch:ListMetrics",
        ],
        resources: ["*"],
      })
    );



    // const rule = new events.Rule(this,'BuildFailEventRule', {
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






  }
}
