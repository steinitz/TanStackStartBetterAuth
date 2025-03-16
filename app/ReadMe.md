Initial version built with TanStack Router and TanStack Start based on instructions at https://tanstack.com/router/latest/docs/framework/react/start/build-from-scratch

Better-Auth installed with instructions at https://www.better-auth.com/docs/installation

then the better usage guide https://www.better-auth.com/docs/basic-usage

Note: pre-release Tanstack Start's api handling might have had issues with pnpm so reverted to npm.  Left an abandoned pnpm-lock.yaml in the repo

The modal Dialog shares open state with parent components via a ref created with useImperativeHandle. I doesn't save many lines of code, compared to each parent creating is own useState variables but I like it anyway as a proof of Meta-warned-against concept