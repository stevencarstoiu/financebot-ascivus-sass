# Synthetic data only

There is deliberately no automatic commercial seed. `/demo` fixtures live only in memory. SQL integration and connected tests generate synthetic data exclusively in their own disposable databases; never run them against real customer projects. `db.seed.enabled=false`.
