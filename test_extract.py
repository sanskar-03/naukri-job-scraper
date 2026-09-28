import urllib.request
import re

req = urllib.request.Request('https://www.naukri.com/java-developer-jobs-in-chennai', headers={'User-Agent': 'Mozilla/5.0'})
try:
    html = urllib.request.urlopen(req).read().decode('utf-8')
    jobs = re.findall(r'"jobId":"([^"]+)"', html)
    print("Found job IDs:", len(jobs))
    if jobs:
        print(jobs[:5])
    
    titles = re.findall(r'"title":"([^"]+)"', html)
    print("Found titles:", len(titles))
    if titles:
        print(titles[:5])
except Exception as e:
    print(e)
