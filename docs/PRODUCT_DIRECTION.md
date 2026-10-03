# oppie.lab — product vision

oppie.lab starts with a direction, not a known problem.

The user can enter a market, geography, industry, role, workflow area, constraint or loose prompt:

> financial operations in European RIAs

The engine then looks for:

- painful, repeated work;
- companies already paying people or vendors to do it;
- buyers and procurement demand;
- existing services, vendors and business models;
- prices, salaries and contract values;
- gaps where a business could be copied, adapted or started.

The engine returns candidates, not conclusions. A candidate must be backed by quotes, figures, URLs
and source status. A human accepts or rejects it before it becomes a tracked problem in the app.

The product loop is:

```text
direction -> sources -> workflows -> repeated problems -> business patterns
                         |                    |
                         +------ human review-+
                                               |
                              accepted problem -> validation -> continue / park / kill
```

The engine can suggest “investigate adapting this service model”. It cannot claim that the business
will work, silently create a problem, or treat a complaint as proof of payment.

The existing rubric belongs after discovery. It helps inspect an accepted candidate; it is not the
discovery experience and not the product's promise.

The first real build should therefore be:

1. a discovery input;
2. one source adapter;
3. candidate problem and business-pattern proposals;
4. a human review queue;
5. acceptance into the existing Problem validation loop.

The normative version is
`openspec/changes/product-direction/specs/product-direction/spec.md`.
