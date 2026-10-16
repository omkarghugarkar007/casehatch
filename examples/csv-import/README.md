> This folder preserves the original illustrative design artifacts. For the executable fixture, use [the working demo](../demo/README.md). These illustrative reports never satisfy a gate.

# Synthetic CSV-import design example

This directory demonstrates the planned data relationships. It contains no runnable app or tests. All documents and decisions are invented public examples, and all report results are illustrative.

## Read in order

1. [BRD](context/BRD.md): tenant isolation, identity and business outcomes.
2. [PRD](context/PRD.md): normal behavior, duplicate response and size boundary.
3. [Ticket](context/TICKET.md): current acceptance criteria and two unresolved decisions.
4. [Feature record](feature.example.json): source hashes, two example answers, five required obligations and seven concrete cases.
5. [Report record](report.example.json): a deliberately incomplete/failing illustrative result.
6. [Config example](config.example.json): planned local policy and adapter configuration.

The duplicate/retry and size obligations each need two cases. Passing one case does not complete the whole obligation. In the sample report, three of five obligations have fresh execution (60%) and two of five have passing outcomes (40%). A failure and incomplete evidence coexist, so the sample exit code is 1 and both are visible.

The two questions concern atomic validation and retry response. Tenant isolation and the duplicate-content requirement already appear in the sources, so the workflow does not ask those again. A low-priority filename-display concern is explicitly deferred and stays quiet until relevant changes occur.

`exampleOnly` and `illustrative_not_executed` are intentional. The future runtime must reject these files as execution evidence. The actual resettable fixture app, test generation and reporter integration are implementation backlog tasks.
