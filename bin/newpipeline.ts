#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { NewpipelineStack } from '../lib/newpipeline-stack';
import { PipelineProject } from 'aws-cdk-lib/aws-codebuild';

const app = new cdk.App();
const pipelineStack=new NewpipelineStack(app, 'NewpipelineStack', {


});








