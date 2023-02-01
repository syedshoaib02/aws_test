import * as cdk from 'aws-cdk-lib';
import { SecretValue } from 'aws-cdk-lib';
import { BuildSpec, LinuxBuildImage, PipelineProject } from 'aws-cdk-lib/aws-codebuild';
import { Artifact, Pipeline } from 'aws-cdk-lib/aws-codepipeline';
import { CloudFormationCreateUpdateStackAction, CodeBuildAction, GitHubSourceAction } from 'aws-cdk-lib/aws-codepipeline-actions';
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

      ],
    });


    

    this.pipeline.addStage({
      stageName: "Pipeline_Update",
      actions: [
        new CloudFormationCreateUpdateStackAction({
          actionName: "Pipeline_Update",
          stackName: "PipelineStack",
          templatePath: this.cdkBuildOutput.atPath("NewpipelineStack.template.json"),
          adminPermissions: true,
        }),
      ],
    });
    ///




    
   
  }
}
