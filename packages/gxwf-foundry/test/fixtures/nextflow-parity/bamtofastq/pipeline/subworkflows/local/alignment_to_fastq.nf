include { SAMTOOLS_VIEW as SAMTOOLS_CHR              } from '../../modules/nf-core/samtools/view/main'
include { SAMTOOLS_VIEW as SAMTOOLS_VIEW_MAP_MAP     } from '../../modules/nf-core/samtools/view/main'
include { SAMTOOLS_VIEW as SAMTOOLS_VIEW_UNMAP_UNMAP } from '../../modules/nf-core/samtools/view/main'
include { SAMTOOLS_COLLATE                           } from '../../modules/nf-core/samtools/collate/main'
include { SAMTOOLS_FASTQ                             } from '../../modules/nf-core/samtools/fastq/main'
workflow ALIGNMENT_TO_FASTQ {
    SAMTOOLS_CHR()
    SAMTOOLS_VIEW_MAP_MAP()
    SAMTOOLS_VIEW_UNMAP_UNMAP()
    SAMTOOLS_COLLATE()
    SAMTOOLS_FASTQ()
}
