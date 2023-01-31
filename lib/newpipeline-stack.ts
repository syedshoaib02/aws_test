import * as cdk from 'aws-cdk-lib';
import { SecretValue } from 'aws-cdk-lib';
import { BuildSpec, LinuxBuildImage, PipelineProject } from 'aws-cdk-lib/aws-codebuild';
import { Artifact, Pipeline } from 'aws-cdk-lib/aws-codepipeline';
import { CodeBuildAction, GitHubSourceAction } from 'aws-cdk-lib/aws-codepipeline-actions';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';

// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class NewpipelineStack extends cdk.Stack {

  private readonly pipeline: Pipeline;
  private readonly cdkBuildOutput: Artifact;
  private readonly serviceBuildOutput: Artifact;
  private readonly serviceSourceOutput: Artifact;
  private readonly pipelineNotificationsTopic: Topic;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);


    this.pipeline = new Pipeline(this, 'Pipeline', {
      pipelineName: "Pipeline",
      crossAccountKeys: false,
      restartExecutionOnUpdate: true,

    })

    const cdkSourceOutput = new Artifact("CDKSourceOutput");
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
        output:cdkSourceOutput
        

       }),

      //  new GitHubSourceAction({
      //   owner: "syedshoaib02",
      //   repo: "aws_test_backend",
      //   branch: "master",
      //   actionName: "Service_Source",
      //   oauthToken: SecretValue.secretsManager("git_aws"),
      //   output:this.serviceSourceOutput
        

      //  }),
      ],
    })




    this.cdkBuildOutput = new Artifact("CdkBuildOutput");
    this.serviceBuildOutput = new Artifact("ServiceBuildOutput");


    this.pipeline.addStage({
      stageName: "Build",
      actions: [
        new CodeBuildAction({

          actionName: "CDK_Build",
          input: cdkSourceOutput,
          outputs: [this.cdkBuildOutput],
          project: new PipelineProject(this, "CdkBuildProject", {
            environment: {
              buildImage: LinuxBuildImage.STANDARD_5_0,
            },
            buildSpec: BuildSpec.fromSourceFilename(
              "build-specs/cdk-build-spec.yml"
            ),
          }),
        }),

        // new CodeBuildAction({
        //   actionName: "Service_Build",
        //   input: this.serviceSourceOutput,
        //   outputs: [this.serviceBuildOutput],
        //   project: new PipelineProject(this, "ServiceBuildProject", {
        //     environment: {
        //       buildImage: LinuxBuildImage.STANDARD_5_0,
        //     },
        //     buildSpec: BuildSpec.fromSourceFilename(
        //       "build-specs/service-build-spec.yml"
        //     ),
        //   }),
        // }),

      ],
    });






    
   
  }
}
