# Performance Testing with K6

> Load testing apps-api with scheduled latency report

### Tested APIs
- Zone 
- Crop Configuration
- To be added...

## Workflow Schedule
    Currently, the GitHub action workflow is scheduled to be triggered once a week, at 00:00 on Sunday.
    Cron expression: `'0 0 * * 0'` 

## Workflow Dispatch
    The workflow also has a workflow_dispatch event trigger, and can be run manually.

## References 
- https://ecoation.atlassian.net/wiki/spaces/EN/pages/2108489731/API+Performance+Testing