ns = window[requireConfig.namespace]
domains = requireConfig.domains
fallback = ns.fallback
DataReg = /^data::/
isRelative = (reqStr) -> reqStr[0...2] is './'

makeRequire = (dom, pathName) -> # each module gets its own unique require function based on where it is to be able to resolve better
  (reqStr) ->
    console.log("#{dom}:#{pathName} <- #{reqStr}")
    if DataReg.test(reqStr)
      d = reqStr.replace(DataReg,'')
      return ns.data[d] if ns.data[d]
      return console.error("Unable to resolve data require for #{d}")
    if (isRel = isRelative(reqStr))
      reqStr = resolveRelative(dom, pathName, reqStr[2...])
    scannable = if isRel then [dom] else [dom].concat domains.filter((e) -> e isnt dom) # look through current first (and only current if relative)
    return ns[o][reqStr] for o in scannable when ns[o][reqStr]
    return fallback(reqStr) if fallback and 'Function' is typeof fallback # else what external require could find
    return console.error("Unable to resolve require for: #{reqStr}")

toAbsPath = (domain, pathName, relReqStr) ->
  folders = pathName.split('/')[0...-1] # slice away the filename
  while relReqStr[0...3] is '../'
    folders = folders[0...-1] # slice away the top folder every time it is required
    relReqStr = relReqStr[3...]
  folders.concat(relReqStr.split('/')).join('/') # take the remaining path and make the string


ns.define = (name, domain, fn) -> # pass in a fn that expects require, module and exports, this will create/refer these objects/fns correctly
  d = ns[domain]
  d[name] = {} if !d[name]
  module = {}
  fn(makeRequire(domain, name), module, d[name])
  if module.exports
    delete d[name] # need to properly override it this is to work
    d[name] = module.exports
  return

ns.require = makeRequire('client','browser')
