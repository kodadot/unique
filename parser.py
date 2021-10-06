from yaml import safe_load, YAMLError

with open("project.yaml", "r") as stream:
    try:
        parsed = safe_load(stream)
        handlers = parsed['definitions']['mapping']['handlers']
        for handler in handlers:
            if ('method' in handler['filter']):
                fn = handler['filter']['method']
                print(f"case '{fn}':")
                x = handler['handler']
                print(f'  return {x}(event)')
    except YAMLError as exc:
        print(exc)