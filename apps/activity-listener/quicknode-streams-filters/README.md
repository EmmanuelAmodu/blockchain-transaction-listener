# QuickNode Stream Filters

## Overview

This directory contains filter scripts that are **NOT part of this service's codebase**. The scripts are deployed and executed upstream directly within the QuickNode service infrastructure.

## Purpose

Filters are applied to blockchain data streams before they reach our webhook endpoints. Each script processes raw blockchain data and filters it based on our specific requirements, ensuring that:

- Only relevant transactions are forwarded to our service
- Data is pre-processed and formatted according to our needs
- Billing costs are minimized as we only pay for filtered data that reaches our webhooks

## Linting

Filter files are excluded from ESLint checks as they:

- Run in a different execution context (QuickNode environment)
- Have access to different global scope (`qnLib`, etc.)
- Follow QuickNode's specific scripting requirements
