## Setup testing env

You can use docker to set up database environment, take postgres for example:

```bash
docker run --name pg_test \
  -p 0.0.0.0:5432:5432 \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=123123123 \
  -d postgres
```
