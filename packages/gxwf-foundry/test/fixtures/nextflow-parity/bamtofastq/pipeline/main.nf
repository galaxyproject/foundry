include { BAMTOFASTQ } from './workflows/bamtofastq'
workflow NFCORE_BAMTOFASTQ { BAMTOFASTQ() }
workflow { NFCORE_BAMTOFASTQ() }
